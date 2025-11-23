#ifndef DATA_STRUCTURES__ARRAY_OF_ARRAYS_VIEW_H
#define DATA_STRUCTURES__ARRAY_OF_ARRAYS_VIEW_H

#include "Array_of_Arrays_Interface.h"

namespace data_structures {

template <typename T>
class ArrayOfArraysView : public ArrayOfArraysInterface<T> {

public:

    using ArrayOfArraysInterface<T>::m_linearizedMemory;
    using ArrayOfArraysInterface<T>::m_arraysOfTsSizes;
    using ArrayOfArraysInterface<T>::m_memoryOffsets;
    using ArrayOfArraysInterface<T>::m_maxSizesStorage;

    using MaxSizesStorage = typename ArrayOfArraysInterface<T>::MaxSizesStorage;

    friend ArrayOfArraysInterface<T>;

    ArrayOfArraysView(const ArrayOfArraysView& otherArrayOfArraysView) = default;
    ArrayOfArraysView(ArrayOfArraysView&& otherArrayOfArraysView) = default;

    virtual ~ArrayOfArraysView() = default;

private:

    ArrayOfArraysView(
        T* linearizedMemory, std::vector<size_t>* arraysOfTsSizes, 
        std::vector<size_t>* memoryOffsets, MaxSizesStorage* maxSizesStorage
    ) : ArrayOfArraysInterface<T>{} {

        m_linearizedMemory = linearizedMemory;
        m_arraysOfTsSizes = arraysOfTsSizes;
        m_memoryOffsets = memoryOffsets;
        m_maxSizesStorage = maxSizesStorage;
    }

};

}

#endif