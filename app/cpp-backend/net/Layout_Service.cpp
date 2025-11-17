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
    uint16_t maxListenQueueSizeEnforcedByOS;
    {
        std::unique_ptr<FILE, decltype(&pclose)> pipe = std::unique_ptr<FILE, decltype(&pclose)>(
            popen("sysctl net.core.somaxconn | tr ' ' '\n' | tail -n 1" ,"r"), pclose
        );
        if (!pipe) {
            maxListenQueueSizeEnforcedByOS = 10;
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
        ? std::min(maxListenQueueSizeEnforcedByOS, optMaxListenQueueSize.value())
        : maxListenQueueSizeEnforcedByOS;
    logging::log_debug(
        "Layout service at " + m_ipAddress + ":" + std::to_string(m_port)
        + "will allow up to " + std::to_string(m_maxListenQueueSize)
        + " queued up tcp connections (OS limit = "
        + std::to_string(maxListenQueueSizeEnforcedByOS) + ")."
    );    
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
    logging::log_trace(
        "Layout service at " + m_ipAddress + ":"
        + std::to_string(m_port) + " will create "
        + std::to_string(m_clientHandlingThreadCount)
        + " client handling threads."
    );

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
                            logging::log_debug(
                                "Thread " + std::to_string(threadId) + " in layout service "
                                + m_ipAddress + ":" + std::to_string(m_port) 
                                + " received data on socket with fd = " + std::to_string(*it) + "."
                            );

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

                            appendChunkToClientMessageStream(*it, threadId, readData);
                            std::vector<std::string> messages = extractMessagesFromClientStreamedData(*it, threadId);

                            for (size_t i=0; i<messages.size(); ++i) {
                                const std::string& m = messages[i];
                                uint16_t graphId = readGraphIdFromClientDataChunk(m);
                                if (modifyReqestGraphAfterReceivingNewData(m, threadId, *it)) {
                                    Graph graphForClientFd(
                                        std::get<0>(m_graphAdjListsForClientRequests[threadId][graphId]), 
                                        std::get<1>(m_graphAdjListsForClientRequests[threadId][graphId]),
                                        std::get<2>(m_graphAdjListsForClientRequests[threadId][graphId])
                                    );
                                    const std::string logGraphId = std::to_string(*it) + ":" + std::to_string(graphId);
                                    logging::log_info(
                                        "Client on socket with fd = " + std::to_string(*it)
                                        + " requested a new layout computation for graph (graph_id = " 
                                        + logGraphId + ") with "
                                        + std::to_string(graphForClientFd.getVertexCount()) + " vertices and "
                                        + std::to_string(graphForClientFd.getEdgeCount()) + " edges."
                                    );

                                    std::mutex& graphBuildEntriesMutexForThread = m_graphBuildEntriesMutexes[threadId];
                                    std::unique_lock<std::mutex> lock(graphBuildEntriesMutexForThread);
                                    m_graphLayoutsForClientRequests[threadId][graphId] = std::make_pair(
                                        *it, std::nullopt
                                    );
                                    m_graphAdjListsForClientRequests[threadId].erase(*it);
                                    lock.unlock();
                                    logging::log_trace(
                                        "Created an empty optional graph layout field for graph with id = "
                                        + logGraphId + " in graph layouts for client requests array in thread "
                                        + std::to_string(threadId) + "."
                                    );
                                    logging::log_info(
                                        "Removed client socket with fd = " + std::to_string(*it) 
                                        + " from client requests array in thread "
                                        + std::to_string(threadId) + " based on preconceived notion that client sends only one graph per socket."
                                    );

                                    m_layoutServiceThreadPool.enqueueTask({
                                        [this, threadId, graphId, &graphForClientFd, &logGraphId](void* unused) -> void {
                                            logging::log_trace("Will compute levels for graph with id" + logGraphId + ".");
                                            assignLevels(graphForClientFd);
                                            logging::log_debug("Computed levels for graph with id = " + logGraphId + ".");

                                            logging::log_trace("Will colour graph with id = " + logGraphId + ".");
                                            GraphColourer graphColourer(
                                                const_cast<const GraphColourer::AlgorithmParams&>(*m_colouringParams)
                                            );
                                            graphColourer.setLogGraphId(logGraphId);

                                            auto&& [colouredGraph, colourHierarchyRoot] = graphColourer.assignColoursToGraph(
                                                graphForClientFd, m_maxRecursionInGraphColouring
                                            );
                                            logging::log_info("Coloured graph with id = " + logGraphId + ".");

                                            // TODO: Perform QAP and reassign indices in colour hierarchy tree.

                                            logging::log_trace("Will create layout for graph with id = " + logGraphId + ".");
                                            LayoutDrawer layoutDrawer(
                                                const_cast<const LayoutDrawer::AlgorithmParams&>(*m_layoutAlgParams)
                                            );
                                            auto graphLayout = layoutDrawer.findLayoutForGraph(
                                                colouredGraph, colourHierarchyRoot, m_defaultEpsilonInLayoutDrawing
                                            );
                                            logging::log_info("Created layout for graph with id = " + logGraphId + ".");

                                            std::mutex& layoutEmplacementMutex = m_graphBuildEntriesMutexes[threadId];
                                            std::unique_lock<std::mutex> lock(layoutEmplacementMutex);
                                            m_graphLayoutsForClientRequests[threadId][graphId].second = graphLayout;
                                            lock.unlock();
                                            logging::log_debug(
                                                "Emplaced ready layout for graph with id = " 
                                                + logGraphId + " in graph layouts for client requests array."
                                            );
                                        }
                                    });
                                }
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
                        int clientFdToRemove = (it->second).first;
                        std::string logGraphId = std::to_string(clientFdToRemove) + ":" + std::to_string(graphId);
                        logging::log_trace(
                            "Removing graph layout for client request for graph with id = "
                            + logGraphId + " for socket with fd = " +
                            std::to_string(clientFdToRemove) + " because the layout has been computed and will be sent."
                        );

                        std::unique_lock<std::mutex> lock(m_graphBuildEntriesMutexes[threadId]);
                        // std::string graphLayoutString
                        it = m_graphLayoutsForClientRequests[threadId].erase(it);
                        end = m_graphLayoutsForClientRequests[threadId].end();
                        lock.unlock();
                        sendReturnLayoutString(clientFd, threadId, graphId, finishedGraphLayout);
                        logging::log_debug(
                            "Removed graph layout for client request for graph with id = "
                            + logGraphId + " for socket with fd = " +
                            std::to_string(clientFdToRemove) + " because the layout has been be sent back to the client."
                        );
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

    logging::log_trace("Launching layout server...");
    m_serverThread = std::thread([this, &serverStartUpCV, &finalizeStartUp]() -> void {
        internalStart(finalizeStartUp, serverStartUpCV);
    });

    std::unique_lock<std::mutex> lock(serverStartUpMutex);
    while (!m_serverRunning) {
        serverStartUpCV.wait(lock);
    }

    finalizeStartUp = true;
    logging::log_info("Layout server launched successfully.");
}


void LayoutService::shutDown() {
    if (!m_serverRunning) return;
    logging::log_trace("Shutting down layout service...");
    m_serverRunning = false;
    m_serverThread.join();
    logging::log_info("Successfully shut down layout service.");
}


void LayoutService::appendChunkToClientMessageStream(
    int clientFd, int threadId, const std::string& messageChunk
) {
    std::mutex& chunkAppendingMutex = m_clientMessageStreamMutexes[threadId];
    std::unique_lock<std::mutex> lock(chunkAppendingMutex);
    m_clientMessageStreams[threadId][clientFd] += messageChunk;
    lock.unlock();
}


std::vector<std::string> LayoutService::extractMessagesFromClientStreamedData(int clientFd, int threadId) {
    logging::log_trace(
        "Will attempt to extract messages from clients stream data for client socket with fd = "
        + std::to_string(clientFd) + "..."
    );
    size_t i = 0;
    size_t pipeCount = 0;
    std::mutex& clientStreamMessagesMutex = m_clientMessageStreamMutexes[threadId];
    
    std::unique_lock<std::mutex> lock(clientStreamMessagesMutex);
    size_t n = m_clientMessageStreams[threadId].size();
    auto& clientMessageStream = m_clientMessageStreams[threadId][clientFd];
    for (size_t j=0; j<n; ++j) {
        if (clientMessageStream[j] == '|') {
            if ((++pipeCount)%2 == 0) i = j+1;
        }
    }
    std::string tempClientMessageStream = std::move(clientMessageStream);    
    clientMessageStream = std::string(
        std::next(clientMessageStream.begin(), i), clientMessageStream.end()
    );
    lock.unlock();

    tempClientMessageStream.resize(i);
    std::stringstream allCompleteClientMessageStream(tempClientMessageStream);
    std::vector<std::string> completeMessages;
    std::string message;
    size_t extractedMessagesCount = 0;
    while (std::getline(allCompleteClientMessageStream, message, '|')) {
        ++extractedMessagesCount;
        completeMessages.emplace_back(std::move(message));
    }

    logging::log_debug(
        "Extracted " + std::to_string(extractedMessagesCount)
        + " complete messages from client on socket with fd = "
        + std::to_string(clientFd) + "."
    );

    return completeMessages;
}


void LayoutService::internalStart(
    const bool& finalizeStartUp, std::condition_variable& serverStartUpCV
) {

    logging::log_trace(
        "Layout service will create a layout computation thread pool of size " 
        + std::to_string(m_layoutServiceThreadPool.getThreadCount()) + "..."
    );
    m_layoutServiceThreadPool.start();
    logging::log_info("Layout service created layout computation thread pool.");

    logging::log_trace(
        "Layout service will create server socket at "
        + m_ipAddress + ":" + std::to_string(m_port) + "."
    );
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
    logging::log_info(
        "Layout service created server socket at "
        + m_ipAddress + ":" + std::to_string(m_port) + "."
    );
    logging::log_debug(
        "Layout service can queue up to " + std::to_string(m_maxListenQueueSize) + " tcp connections."
    );
 
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
        logging::log_info(
            "Layout service received connection request denoted by fd = "
            + std::to_string(clientFd) + " and assigned it to client handling thread number "
            + std::to_string(targetThread) + "."
        );
    }

    close(serverSocketFd);
    logging::log_debug(
        "Layout service at " + m_ipAddress + ":"
        + std::to_string(m_port) + " successfully closed its socket."
    );
}


void LayoutService::sendReturnLayoutString(
    int clientFd, int threadId, uint16_t graphId, const std::vector<CartesianCoords>& layoutVector
) {

    auto clientMessageChunks = buildLayoutPositionsReturnStringVector(layoutVector, graphId);
    for (const auto& messageChunk : clientMessageChunks) {
        send(clientFd, static_cast<const void*>(messageChunk.data()), sizeof(char)*messageChunk.size(), 0);
    }
    std::mutex& graphLayoutThreadMutex = m_graphBuildEntriesMutexes[threadId];
    std::unique_lock<std::mutex> lock(graphLayoutThreadMutex);
    m_graphLayoutsForClientRequests[threadId].erase(graphId);
    lock.unlock();

    close(clientFd);
}


bool LayoutService::modifyReqestGraphAfterReceivingNewData(
    const std::string& strNewData, int threadId, int clientId
) {

    uint16_t graphId = readGraphIdFromGraphMessageChunk(strNewData);
    std::string logGraphId = std::to_string(clientId) + ":" + std::to_string(graphId);
    logging::log_trace("Updating graph data for " + logGraphId + "...");
    std::unique_lock<std::mutex> lock(m_graphBuildEntriesMutexes[threadId]);
    auto graphBuildEntry = std::move(m_graphAdjListsForClientRequests[threadId][graphId]);
    lock.unlock();    
    updateGraphBuildEntry(strNewData, graphBuildEntry);
    bool isFinal = std::get<2>(graphBuildEntry);        
    lock.lock();
    m_graphAdjListsForClientRequests[threadId][graphId] = std::move(graphBuildEntry);
    lock.unlock();
    logging::log_trace(
        "Updated graph data for " + logGraphId + ", the update was "
        + (isFinal ? "final." : "not final.")
    );
    return isFinal;
}

}
