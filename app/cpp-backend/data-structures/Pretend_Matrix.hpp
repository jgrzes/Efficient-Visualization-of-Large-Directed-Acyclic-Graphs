#ifndef DATA_STRUCTURES__PRETEND_MATRIX_H
#define DATA_STRUCTURES__PRETEND_MATRIX_H

#include <functional>

namespace data_structures {

template <typename T>
class PretendMatrix {

public:

    PretendMatrix() = delete;
    PretendMatrix(std::function<T(size_t, size_t)>&& dynamicCellContentsCalculator) :
        m_dynamicCellContentsCalculator{
            std::forward<std::function<T(size_t, size_t)>>(dynamicCellContentsCalculator)
        } {}

    T at(size_t i, size_t j) const {
        return m_dynamicCellContentsCalculator(i, j);
    }    

    T at(size_t i, size_t j) {
        return m_dynamicCellContentsCalculator(i, j);
    }

private:

    std::function<T(size_t, size_t)> m_dynamicCellContentsCalculator;

};

}

#endif 