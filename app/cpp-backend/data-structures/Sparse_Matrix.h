#ifndef DATA_STRUCTURES__SPARSE_SYMMETRIC_MATRIX
#define DATA_STRUCTURES__SPARSE_SYMMETRIC_MATRIX

#include <tuple>
#include <vector>
#include <unordered_map>
#include <variant>
#include <stdexcept>
#include <optional>

#include "Sparse_Array.h"

using size_t = std::size_t;

namespace data_structures {

template <typename T, bool Symmetric = true, bool AutoOptimizng = true>
class SparseMatrix {

public:

    SparseMatrix() : SparseMatrix{0} {}
    SparseMatrix(size_t n) : m_n{n} {
        m_sparseMatrixData.reserve(m_n);
        for (size_t i=0; i<m_n; ++i) {
            m_sparseMatrixData.emplace_back(m_n);
        }
    }

    // Returns the number of rows (`rows` = `cols`).
    size_t size() const {return m_n;}
    
    // Warning: calling `at(i, j)` will always construct the object, making the cell not-empty.
    const T& at(size_t i, size_t j) const {
        if constexpr (Symmetric) {
            if (i > j) std::swap(i, j);
        }
        if (i >= m_n && j >= m_n) {
            throw std::runtime_error{
                "Sparse Symmetric Matrix error: attempting to breach bounds of the matrix"
            };
        }
        // size_t a, b;
        // a = std::min(i, j);
        // b = std::max(i, j);
        return m_sparseMatrixData[i][j];
    }

    // Warning: calling `at(i, j)` will always construct the object, making the cell not-empty.
    T& at(size_t i, size_t j) {
        if constexpr (Symmetric) {
            if (i > j) std::swap(i, j);
        }
        if (i >= m_n && j >= m_n) {
            throw std::runtime_error{
                "Sparse Symmetric Matrix error: attempting to breach bounds of the matrix"
            };
        }
        return m_sparseMatrixData[i][j];
    }

    // Checks if the `a_ij` is one of the zero-like cells.
    bool hasDataAt(size_t i, size_t j) const {
        if constexpr (Symmetric) {
            if (i > j) std::swap(i, j);
        }
        return m_sparseMatrixData[i].hasDataAt(j);
    }

    T dataAtOr(size_t i, size_t j, const T& t) const {
        if (hasDataAt(i, j)) return at(i, j);
        return t;
    }

    T dataAtOr(size_t i, size_t j, T&& t) const {
        if (hasDataAt(i, j)) return at(i, j);
        return std::move(t);
    }

    void optimizeRow(size_t i) {m_sparseMatrixData[i].optimize();}

    void optimizeWholeMatrix() {for (size_t i=0; i<m_n; ++i) optimizeRow(i);}

private:

    // `n` = number of rows = number of cols
    const size_t m_n; 
    std::vector<SparseArray<T, AutoOptimizng>> m_sparseMatrixData;

};

}

#endif 