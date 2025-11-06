#include "Layout_Service.hpp"

#include <sys/socket.h>
#include <netinet/in.h>
#include <iostream>
#include <arpa/inet.h>
#include <unistd.h>
#include <sys/select.h>

namespace net {

void LayoutService::createClientHandlingThreads() {
    m_clientFdsForThreads.reserve(m_clientHandlingThreadCount);
    for (size_t i=0; i<m_clientHandlingThreadCount; ++i) {
        m_clientHandlingThreads.emplace_back([this, threadId = i]() -> void {
            while (m_serverRunning) {
                fd_set clientFdSet;
                FD_ZERO(&clientFdSet);
                int maxClientFd = 0;
                size_t n = 0;
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

                }
            }
        })
    }
}

void LayoutService::internalStart() {
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

    while (m_serverRunning) {
        ;
    }

    close(serverSocketFd);

}

}