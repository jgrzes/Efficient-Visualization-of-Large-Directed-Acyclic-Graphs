#include "Layout_Service.hpp"

#include <sys/socket.h>
#include <netinet/in.h>
#include <iostream>
#include <arpa/inet.h>
#include <unistd.h>
#include <sys/select.h>
#include <random>
#include <memory>
#include <cctype>

#include "../graph-preprocessing/assign_levels.h"

namespace net {

auto& assignLevels = graph_preprocessing::assignLevelsInGraph;

void LayoutService::setAndValidateMaxListenQueueSize(std::optional<uint16_t> optMaxListenQueueSize) {
    uint16_t maxListenQueueSize;
    {
        std::unique_ptr<FILE, decltype(&pclose)> pipe = std::unique_ptr<FILE, decltype(&pclose)>(
            popen("sysctl net.core.somaxconn | tr ' ' '\n' | tail -n 1" ,"r"), pclose
        );
        if (!pipe) {
            maxListenQueueSize = 10;
        } else {
            std::array<char, 1024> buffer = {0};
            std::string readBytes;
            while (fgets(buffer.data(), buffer.size() * sizeof(char), pipe.get()) != nullptr) {
                readBytes += buffer.data();
            }
            std::string strMaxListenQueueSize;
            for (size_t i=0; i<std::min(readBytes.size(), 4UL); ++i) {
                if (std::isdigit(static_cast<unsigned char>(readBytes[i]))) {
                    strMaxListenQueueSize += readBytes[i];
                } else break;
            }
        }
    }
    m_maxListenQueueSize = (optMaxListenQueueSize.has_value())
        ? std::min(maxListenQueueSize, optMaxListenQueueSize.value())
        : maxListenQueueSize;
}


void LayoutService::setColouringParams(const GraphColourer::AlgorithmParams& params) {
    m_colouringParams.reset(new GraphColourer::AlgorithmParams(params));
}


void LayoutService::setColouringParams(GraphColourer::AlgorithmParams&& params) {
    m_colouringParams.reset(new GraphColourer::AlgorithmParams(std::move(params)));
}


void LayoutService::setMaxRecursionInGraphColouring(uint32_t maxRecursion) {
    m_maxRecursionInGraphColouring = maxRecursion;
}


void LayoutService::setDefaultEpsilonInLayoutDrawing(double defaultEpsilon) {
    m_defaultEpsilonInLayoutDrawing = defaultEpsilon;
}   


void LayoutService::setLayoutFindingParams(const LayoutDrawer::AlgorithmParams& params) {
    m_layoutAlgParams.reset(new LayoutDrawer::AlgorithmParams(params));
}


void LayoutService::setLayoutFindingParams(LayoutDrawer::AlgorithmParams&& params) {
    m_layoutAlgParams.reset(new LayoutDrawer::AlgorithmParams(std::move(params)));
}


void LayoutService::createClientHandlingThreads() {
    m_clientFdsForThreads.reserve(m_clientHandlingThreadCount);
    for (size_t i=0; i<m_clientHandlingThreadCount; ++i) {
        m_clientHandlingThreads.emplace_back([this, threadId = i]() -> void {
            std::array<char, 1024> buffer;
            while (m_serverRunning) {
                fd_set clientFdSet;
                FD_ZERO(&clientFdSet);
                int maxClientFd = 0;
                int64_t n = 0;
                for (const int clientFd : m_clientFdsForThreads[threadId]) {
                    FD_SET(clientFd, &clientFdSet);
                    maxClientFd = std::max(maxClientFd, clientFd);
                    ++n;
                }
                // TODO: Decide if should lock mutex here

                timeval tv = m_timewaitOnClientRequestReading;
                int clientListeningResults = select(
                    maxClientFd+1, &clientFdSet, NULL, NULL, &tv
                );

                if (clientListeningResults < 0) {
                    throw std::runtime_error{
                        "Layout Service error: something went wrong when listening on client fds in thread " + threadId
                    };
                } else if (clientListeningResults != 0) {
                    int64_t m = 0;
                    auto it = m_clientFdsForThreads[threadId].begin();
                    auto end = m_clientFdsForThreads[threadId].end();
                    while (m < n && it != end) {
                        if (FD_ISSET(*it, &clientFdSet)) {
                            int readBytesCount = read(
                                *it, static_cast<void*>(buffer.data()), 
                                sizeof(char) * buffer.size()
                            );

                            if (readBytesCount < 0) {
                                throw std::runtime_error{
                                    "Layout Service: error when reading from client socket in thread "
                                    + std::to_string(threadId)
                                };
                            }

                            std::string readData(buffer.data(), sizeof(char) * readBytesCount);
                            // TODO: Decide if should move the client socket to the end after reading it.
                            // Probably not really.

                            uint16_t graphId = readGraphIdFromClientDataChunk(readData);
                            if (modifyReqestGraphAfterReceivingNewData(
                                readData, threadId, *it
                            )) {
                                Graph graphForClientFd(
                                    std::get<0>(m_graphAdjListsForClientRequests[threadId][graphId]), 
                                    std::get<1>(m_graphAdjListsForClientRequests[threadId][graphId]),
                                    std::get<2>(m_graphAdjListsForClientRequests[threadId][graphId])
                                );

                                std::mutex& graphBuildEntriesMutexForThread = m_graphBuildEntriesMutexes[threadId];
                                std::unique_lock<std::mutex> lock(graphBuildEntriesMutexForThread);
                                m_graphLayoutsForClientRequests[threadId][graphId] = std::make_pair(
                                    *it, std::nullopt
                                );
                                m_graphAdjListsForClientRequests[threadId].erase(*it);
                                lock.unlock();
                                m_layoutServiceThreadPool.enqueueTask({
                                    [this, threadId, graphId, &graphForClientFd](void* unused) -> void {
                                        assignLevels(graphForClientFd);
                                        GraphColourer graphColourer(
                                            const_cast<const GraphColourer::AlgorithmParams&>(*m_colouringParams)
                                        );

                                        auto&& [colouredGraph, colourHierarchyRoot] = graphColourer.assignColoursToGraph(
                                            graphForClientFd, m_maxRecursionInGraphColouring
                                        );

                                        // TODO: Perform QAP and reassign indices in colour hierarchy tree.
                                        LayoutDrawer layoutDrawer(
                                            const_cast<const LayoutDrawer::AlgorithmParams&>(*m_layoutAlgParams)
                                        );
                                        auto graphLayout = layoutDrawer.findLayoutForGraph(
                                            colouredGraph, colourHierarchyRoot, m_defaultEpsilonInLayoutDrawing
                                        );

                                        std::mutex& layoutEmplacementMutex = m_graphBuildEntriesMutexes[threadId];
                                        std::unique_lock<std::mutex> lock(layoutEmplacementMutex);
                                        m_graphLayoutsForClientRequests[threadId][graphId].second = graphLayout;
                                        lock.unlock();
                                    }
                                });
                            }
                        }
                        ++m;
                    }
                }

                int64_t m = 0;
                auto it = m_graphLayoutsForClientRequests[threadId].begin();
                auto end = m_graphLayoutsForClientRequests[threadId].end();
                while (m < n && it != end) {
                    auto graphId = it->first;
                    auto& [clientFd, graphLayoutEntry] = it->second;
                    if (!graphLayoutEntry.has_value()) {
                        ++it;
                    } else {
                        auto finishedGraphLayout = std::move(graphLayoutEntry.value());
                        std::unique_lock<std::mutex> lock(m_graphBuildEntriesMutexes[threadId]);
                        // std::string graphLayoutString
                        it = m_graphLayoutsForClientRequests[threadId].erase(it);
                        end = m_graphLayoutsForClientRequests[threadId].end();
                        lock.unlock();
                        sendReturnLayoutString(clientFd, finishedGraphLayout);
                    }
                    ++m;

                }
            }
        });
    }
}


void LayoutService::start() {
    if (m_serverRunning) return;
    std::mutex serverStartUpMutex;
    std::condition_variable serverStartUpCV;
    bool finalizeStartUp = false;

    m_serverThread = std::thread([this, &serverStartUpCV, &finalizeStartUp]() -> void {
        internalStart(finalizeStartUp, serverStartUpCV);
    });

    std::unique_lock<std::mutex> lock(serverStartUpMutex);
    while (!m_serverRunning) {
        serverStartUpCV.wait(lock);
    }

    finalizeStartUp = true;
}


void LayoutService::shutDown() {
    if (!m_serverRunning) return;
    m_serverRunning = false;
    m_serverThread.join();
}


void LayoutService::internalStart(
    const bool& finalizeStartUp, std::condition_variable& serverStartUpCV
) {

    m_layoutServiceThreadPool.start();
    int serverSocketFd;
    if (serverSocketFd = socket(AF_INET, SOCK_STREAM, 0);
        serverSocketFd <= 0) {

        throw std::runtime_error{
            "Layout Service error: failed to create a socket"
        };
    }

    int opt = 1;
    if (setsockopt(serverSocketFd, SOL_SOCKET, SO_REUSEADDR, static_cast<void*>(&opt), sizeof(opt))) {
        throw std::runtime_error{
            "Layout Service error: failed to set server socket options"
        };
    }
    
    struct sockaddr_in serverAddress;
    serverAddress.sin_family = AF_INET;
    serverAddress.sin_port = htons(m_port);
    if (inet_pton(AF_INET, m_ipAddress.c_str(), static_cast<void*>(&serverAddress.sin_addr)) <= 0) {
        throw std::runtime_error{
            "Layout Service error: faield to translate ip address of the server"
            + std::string(" (specified ip address: ") + m_ipAddress + ")"
        };
    }

    if (bind(serverSocketFd, (const sockaddr*) &serverAddress, sizeof(serverAddress)) < 0) {
        throw std::runtime_error{
            "Layout Service error: could not bind the server socket"
        };
    }

    if (listen(serverSocketFd, m_maxListenQueueSize) < 0) {
        throw std::runtime_error{
            "Layout Service error: could not initiate listening on the server socket"
        };
    }

    m_serverRunning = true;
    while (!finalizeStartUp) {
        serverStartUpCV.notify_one();
    }

    int clientFd;
    socklen_t serverAddressLen = sizeof(serverAddress);
    std::random_device rd;
    while (m_serverRunning) {
        clientFd = accept(serverSocketFd, (sockaddr*) &serverAddress, &serverAddressLen);
        int targetThread = rd() & m_clientHandlingThreadCount;
        {
            std::mutex& targetThreadClientFdListMutex = m_clientListModMutexes[targetThread];
            std::unique_lock<std::mutex> lock(targetThreadClientFdListMutex);
            m_clientFdsForThreads.emplace_back(clientFd);
            lock.unlock();
        }
        {
            std::mutex& targetThreadGraphBuildEntriesMutex = m_graphBuildEntriesMutexes[targetThread];
            std::unique_lock<std::mutex> lock(targetThreadGraphBuildEntriesMutex);
            m_graphAdjListsForClientRequests[targetThread][clientFd] = {0, {}, false};
            lock.unlock();
        }
    }

    close(serverSocketFd);

}

}
