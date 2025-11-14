#include "serialized_message_processing.hpp"

#include <stdio.h>
#include <string.h>
#include <stdexcept>
#include <stdlib.h>

namespace net {

#define _stringsEqual(_s1, _s2) (strcmp(_s1, _s2) == 0)


uint16_t readGraphIdFromGraphMessageChunk(const std::string& graphMessageChunk) {
    std::stringstream graphMessageChunkStream;
    std::string field;

    static const char* graphIdKey = "graph_id";
    while (graphMessageChunkStream >> field) {
        char* savePtr;
        char* fieldAsCharArr = field.data();
        char* lhs = strtok_r(fieldAsCharArr, "=", &savePtr);
        char* rhs = strtok_r(nullptr, "=", &savePtr);
        if (!_stringsEqual(lhs, graphIdKey)) {
            throw std::runtime_error{
                "Read Graph id from Message Chunk error: graph_id must be the first key in a chunk"
            };
        }
        return static_cast<uint16_t>(atol(rhs));        
    }

    throw std::runtime_error{
        "Read Graph id from Message Chunk error: graph_id must be the first key in a chunk"
    };
}


void updateGraphBuildEntry(const std::string& graphMessageChunk, GraphBuildEntry& graphBuildEntry) {
    std::stringstream graphMessageChunkStream(graphMessageChunk);
    std::string field;

    // static const char* graphIdKey = "graph_id";
    static const char* isFinalKey = "is_final";
    static const char* numOfVerticesFlag = "n";
    static const char* adjListFlag = "E";
    static const char* trueStringVal = "true";

    while (graphMessageChunkStream >> field) {
        char* savePtr;
        char* fieldAsCharArr = field.data();
        char* lhs = strtok_r(fieldAsCharArr, "=", &savePtr);
        char* rhs = strtok_r(nullptr, "=", &savePtr);
        size_t lhsLength = strlen(lhs);
        size_t rhsLength = strlen(rhs);

        if (_stringsEqual(lhs, isFinalKey)) {
            std::get<2>(graphBuildEntry) = (_stringsEqual(rhs, trueStringVal)) ? true : false;
        } else if (_stringsEqual(lhs, numOfVerticesFlag)) {
            size_t& currentN = std::get<0>(graphBuildEntry);
            size_t readN = std::stol(rhs);
            // std::stringstream rhsStream(rhs);
            // rhsStream >> readN;
            if (currentN != 0 && currentN != readN) {
                throw std::runtime_error{
                    "Update Graph Entry error: incoming graph chunk has different number of vertices than previous ones"
                };
            } else {
                if (currentN == 0 && std::get<1>(graphBuildEntry).size() == 0) {
                    std::get<1>(graphBuildEntry).resize(readN, {});
                }
                currentN = readN;
            }
        } else if (_stringsEqual(lhs, adjListFlag)) {
            std::string adjListAsStrStripped(rhs+1, rhsLength-1); 
            std::stringstream adjListStream(adjListAsStrStripped);
            while (std::getline(adjListStream, field, ';')) {
                char* adjListEntrySavePtr;
                char* adjListEntry = field.data();
                char* sourceVertexStr = strtok_r(adjListEntry, ":", &adjListEntrySavePtr);
                char* destVerticesArrayCharPtr = strtok_r(nullptr, ":", &adjListEntrySavePtr);
                std::string destVerticesArrayStr(
                    destVerticesArrayCharPtr+1, strlen(destVerticesArrayCharPtr)-1
                );

                uint32_t sourceVertex = std::stol(sourceVertexStr);
                // std::stringstream sourceVertexStream(sourceVertexStr);
                // sourceVertexStream >> sourceVertex;
                auto& sourceVertexNSet = std::get<1>(graphBuildEntry)[sourceVertex];

                char* destVerticesArrayCStr = const_cast<char*>(destVerticesArrayStr.c_str());
                char* token = strtok_r(destVerticesArrayCStr, ",", &adjListEntrySavePtr);
                while (token != NULL) {
                    sourceVertexNSet.emplace(atol(token));
                    token = strtok_r(nullptr, ",", &adjListEntrySavePtr);
                }
            }
        }
    }
}


std::vector<std::string> buildLayoutPositionsReturnStringVector(
    const std::vector<CartesianCoords>& layoutPositions, uint16_t graphId, size_t maxStringChunkSize
) {

    size_t n = layoutPositions.size();
    std::vector<std::string> returnMessageChunks;
    std::string currentChunk = "graph_id=" + std::to_string(graphId);

    for (size_t i=0; i<n; ++i) {
        const auto [x, y] = layoutPositions[i];
        std::string vertexPositionAsStr = "i:(" + std::to_string(x) + "," + std::to_string(y) + ")";
        if (vertexPositionAsStr.size() > maxStringChunkSize) {
            throw std::runtime_error{
                "Build Layout Positions Return String Vector error: there exists a positon which is longer than" +
                std::string("max allowed chunk size (") + std::to_string(vertexPositionAsStr.size()) +
                " exceeds " + std::to_string(maxStringChunkSize) + ")"
            };

            if (currentChunk.size() + vertexPositionAsStr.size() > maxStringChunkSize) {
                returnMessageChunks.emplace_back(std::move(vertexPositionAsStr));
                currentChunk = "graph_id=" + std::to_string(graphId);
            }

            if (!currentChunk.empty()) currentChunk += " ";
            currentChunk += vertexPositionAsStr;
        }
    }

    if (!currentChunk.empty()) {
        returnMessageChunks.emplace_back(std::move(currentChunk));
    }

    return returnMessageChunks;
}

#undef _stringsEqual

}