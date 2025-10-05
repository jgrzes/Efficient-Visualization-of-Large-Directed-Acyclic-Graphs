#include "Array_of_Arrays_Interface.h"

#include "Array_of_Arrays_View.h"

namespace data_structures {

template <typename T> ArrayOfArraysView<T> ArrayOfArraysInterface<T>::getArrayOfArraysView() {
    return ArrayOfArraysView(
        m_linearizedMemory, m_arraysOfTsSizes, m_memoryOffsets, m_maxSizesStorage
    );
}

}