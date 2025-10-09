#include "Array_of_Arrays_Interface.h"

#include "Array_of_Arrays_View.h"

namespace data_structures {

// template <typename T> ArrayOfArraysInterface<T>::NestedArrayView::NestedArrayView(const NestedArrayView& otherNestedArrayView) :
//     m_owner{otherNestedArrayView.m_owner}, 
//     m_nestedArrIndex{otherNestedArrayView.m_nestedArrIndex}, 
//     m_arrInMemory{otherNestedArrayView.m_arrInMemory}, 
//     m_size{otherNestedArrayView.m_size}, 
//     m_maxSize{otherNestedArrayView.m_maxSize} {}

template <typename T> ArrayOfArraysView<T> ArrayOfArraysInterface<T>::getArrayOfArraysView() {
    return ArrayOfArraysView(
        m_linearizedMemory, m_arraysOfTsSizes, m_memoryOffsets, m_maxSizesStorage
    );
}

}