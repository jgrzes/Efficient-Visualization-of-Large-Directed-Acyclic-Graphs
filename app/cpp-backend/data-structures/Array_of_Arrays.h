#ifndef DATA_STRUCTURES__ARRAY_OF_ARRAYS_H
#define DATA_STRUCTURES__ARRAY_OF_ARRAYS_H

#include "Array_of_Arrays_Interface.h"

namespace data_structures {

using size_t = std::size_t;

// Derived from the interface class, this class manages its own memory.
// See class `ArrayOfArraysInterface` for more details on what is the idea behind these classes.
template <typename T>
class ArrayOfArrays : public ArrayOfArraysInterface<T> {

public: 

    using ArrayOfArraysInterface<T>::m_linearizedMemory;
    using ArrayOfArraysInterface<T>::m_arraysOfTsSizes;
    using ArrayOfArraysInterface<T>::m_memoryOffsets;
    using ArrayOfArraysInterface<T>::m_maxSizesStorage;

    using MaxSizesStorage = typename ArrayOfArraysInterface<T>::MaxSizesStorage;

    enum class AddOrMaxSize : uint8_t {
        ADD_SIZE = 0,
        MAX_SIZE = 1
    };

    // TODO: add constructors with std::vector<size_t>&& types to improve efficiency.
    
    ArrayOfArrays(const ArrayOfArrays<T>& otherArrayOfArrays) : ArrayOfArraysInterface<T>{} {

        m_arraysOfTsSizes = new std::vector<size_t>(otherArrayOfArrays.m_arraysOfTsSizes);
        m_memoryOffsets = new std::vector<size_t>(otherArrayOfArrays.m_memoryOffsets);
        m_maxSizesStorage = new MaxSizesStorage(otherArrayOfArrays.m_maxSizesStorage);    

        size_t requiredSize = 0;
        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        if (!m_maxSizesStorage->allowsAddSizes()) {
            requiredSize = std::accumulate(
                arraysOfTsSizesRef.begin(), arraysOfTsSizesRef.end(), 0
            );
        } else {
            size_t n = arraysOfTsSizesRef.size();
            auto maxSizesStorageRef = *m_maxSizesStorage;;
            for (size_t arrIndex=0; arrIndex<n; ++arrIndex) {
                requiredSize += maxSizesStorageRef.checkMaxSizeForArray(arrIndex);
            }
        }
        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
    }

    ArrayOfArrays(ArrayOfArrays<T>&& otherArrayOfArrays) : ArrayOfArraysInterface<T>{} {

        m_arraysOfTsSizes = otherArrayOfArrays.m_arraysOfTsSizes;
        m_memoryOffsets = otherArrayOfArrays.m_memoryOffsets;
        m_maxSizesStorage = otherArrayOfArrays.m_maxSizesStorage;
        m_linearizedMemory = otherArrayOfArrays.m_linearizedMemory;
        otherArrayOfArrays.setNullptrs();
    }

    ArrayOfArrays(const std::vector<size_t>& arraysOfTsSizes) : ArrayOfArraysInterface<T>{arraysOfTsSizes} {

        size_t requiredSize = std::accumulate(m_arraysOfTsSizes->begin(), m_arraysOfTsSizes->end(), 0);
        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
        initializeMemoryOffsetsField();
    }

    ArrayOfArrays(const std::vector<size_t>& arraysOfTsSizes, size_t s, AddOrMaxSize sType = AddOrMaxSize::ADD_SIZE) try :
        ArrayOfArraysInterface<T>{arraysOfTsSizes} {

        delete m_maxSizesStorage;
        size_t requiredSize;
        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        if (sType == AddOrMaxSize::MAX_SIZE) {
            size_t n = arraysOfTsSizesRef.size();
            for (size_t i=0; i<n; ++i) {
                size_t startingSizeI = arraysOfTsSizesRef[i];
                if (startingSizeI < s) {
                    throw std::runtime_error{
                        "Arrays Of Arrays error: starting size at " +
                        std::to_string(i) + " exceeds universal max size"
                    };
                }
            }
            // TODO: see if no overflows occur.
            // Sidenote: max value of std::size_t is 4 294 967 295.
            // sqrt(4 294 967 295) ~= 65 500
            requiredSize = s*arraysOfTsSizesRef.size();
            m_maxSizesStorage = new MaxSizesStorage(s);
        } else if (sType == AddOrMaxSize::ADD_SIZE) {
            requiredSize = std::accumulate(
                arraysOfTsSizesRef.begin(), 
                arraysOfTsSizesRef.end(), 
                s*arraysOfTsSizesRef.size()
            );
            std::vector<size_t> maxSizes = arraysOfTsSizesRef;
            for (auto& maxSizeI : maxSizes) maxSizeI += s;
            m_maxSizesStorage = new MaxSizesStorage{std::move(maxSizes)};
        } else {
            throw std::runtime_error{"Arrays Of Arrays error: unknown sType"};
        }

        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
        initializeMemoryOffsetsField();
    } catch (const std::runtime_error& e) {
        resetAndFreeMemory();
        throw std::move(e);
    }

    ArrayOfArrays(const std::vector<size_t>& arraysOfTsSizes, const std::vector<size_t>& maxSizes) try :
        ArrayOfArraysInterface<T>{arraysOfTsSizes, maxSizes} {

        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        auto& maxSizesStorageRef = *m_maxSizesStorage;
        if (arraysOfTsSizesRef.size() != maxSizesStorageRef.size()) {
            throw std::runtime_error{
                "Arrays Of Arrays error: size mismatch between arrays passed to constructor"
            };
        }
        size_t requiredSize = 0;
        for (size_t i=0; i<arraysOfTsSizesRef.size(); ++i) {
            if (arraysOfTsSizesRef[i] > maxSizes[i]) {
                throw std::runtime_error{
                    "Arrays Of Arrays error: starting size at " +
                    std::to_string(i) + " exceeds its allowed max size"
                };
            }
            requiredSize += maxSizes[i];
        }

        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
        initializeMemoryOffsetsField();
    } catch (const std::runtime_error& e) {
        resetAndFreeMemory();
        throw std::move(e);
    }

    ArrayOfArrays<T>& operator=(const ArrayOfArrays<T>& otherArrayOfArrays) {
        if (this == otherArrayOfArrays) return *this;
        resetAndFreeMemory();
        m_arraysOfTsSizes = new std::vector<size_t>(otherArrayOfArrays.m_arraysOfTsSizes);
        m_memoryOffsets = new std::vector<size_t>(otherArrayOfArrays.m_memoryOffsets);
        m_maxSizesStorage = new MaxSizesStorage(otherArrayOfArrays.m_maxSizesStorage);
        size_t requiredSize = 0;
        auto& maxSizesStorageRef = *m_maxSizesStorage;
        if (!maxSizesStorageRef.allowsAddSizes()) {
            requiredSize = std::accumulate(
                maxSizesStorageRef.begin(), maxSizesStorageRef.end(), 0
            );
        } else {
            size_t n = m_arraysOfTsSizes->size();
            for (size_t arrIndex=0; arrIndex<n; ++arrIndex) {
                requiredSize += maxSizesStorageRef.checkMaxSizeForArray(arrIndex);
            }
        }
        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
        return *this;
    }

    ArrayOfArrays<T>& operator=(ArrayOfArrays<T>&& otherArrayOfArrays) {
        if (this == otherArrayOfArrays) return *this;
        resetAndFreeMemory();
        m_arraysOfTsSizes = otherArrayOfArrays.m_arraysOfTsSizes;
        m_memoryOffsets = otherArrayOfArrays.m_memoryOffsets;
        m_maxSizesStorage = otherArrayOfArrays.m_maxSizesStorage;
        otherArrayOfArrays.setNullptrs();
        return *this;
    }

    virtual ~ArrayOfArrays() {resetAndFreeMemory();}

private:

    void resetAndFreeMemory() {
        free(m_linearizedMemory);
        delete m_arraysOfTsSizes;
        delete m_memoryOffsets;
        delete m_maxSizesStorage;
        setNullptrs();
    }

    void setNullptrs() {
        m_linearizedMemory = nullptr;
        m_arraysOfTsSizes = nullptr;
        m_memoryOffsets = nullptr;
        m_maxSizesStorage = nullptr;
    }

    void initializeMemoryOffsetsField() {
        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        size_t n = arraysOfTsSizesRef.size();
        bool addSizesAllowed = m_maxSizesStorage->allowsAddSizes();
        m_memoryOffsets = new std::vector<size_t>(n, 0);
        auto& memoryOffsetsRef = *m_memoryOffsets;
        for (size_t arrIndex=1; arrIndex<n; ++arrIndex) {
            memoryOffsetsRef[arrIndex] = memoryOffsetsRef[arrIndex-1] + (addSizesAllowed
                ? m_maxSizesStorage->checkMaxSizeForArray[arrIndex]
                : arraysOfTsSizesRef[arrIndex]
            );
        }
    }

};

}

#endif