#ifndef DATA_STRUCTURES__SPARSE_SYMMETRIC_MATRIX
#define DATA_STRUCTURES__SPARSE_SYMMETRIC_MATRIX

#include <tuple>
#include <vector>
#include <unordered_map>
#include <variant>
#include <stdexcept>
#include <optional>

#include "Sparse_Array.hpp"

using size_t = std::size_t;

namespace data_structures {

template <typename T, bool Symmetric = true, bool AutoOptimizing = true>
class SparseMatrix {

public:

    SparseMatrix() : SparseMatrix{0} {}
    SparseMatrix(size_t n) : m_rowCount{n}, m_columnCount{n} {
        m_sparseMatrixData.reserve(m_rowCount);
        for (size_t i=0; i<m_rowCount; ++i) {
            m_sparseMatrixData.emplace_back(m_rowCount);
        }
    }

    SparseMatrix(size_t n, size_t m) : m_rowCount{n}, m_columnCount{m} {
        // std::cout << "[Sparse Matrix] Row and column count: " << m_rowCount << ", " << m_columnCount << "\n";
        m_sparseMatrixData.reserve(m_columnCount);
        for (size_t i=0; i<m_rowCount; ++i) {
            m_sparseMatrixData.emplace_back(m_columnCount);
        }
    }

    // TODO: Rename to getRowCount as soon as VSC starts cooperating.
    // Returns the number of rows.
    size_t getRowCount() const {return m_rowCount;}

    size_t getColCount() const {return m_columnCount;}

    const SparseArray<T, AutoOptimizing>& getIthRow(size_t i) const {
        return const_cast<SparseArray<T, AutoOptimizing>&>(
            const_cast<SparseMatrix<T, Symmetric, AutoOptimizing>*>(this)->getIthRow(i)
        );
    }

    SparseArray<T, AutoOptimizing>& getIthRow(size_t i) {
        if (i >= m_rowCount) {
            throw std::runtime_error{
                "Sparse Symmetric Matrix error: attempting to breach bounds of the matrix"
            };
        }
        return m_sparseMatrixData[i];
    }
    
    // Warning: calling `at(i, j)` will always construct the object, making the cell not-empty.
    const T& at(size_t i, size_t j) const {
        if constexpr (Symmetric) {
            if (i > j) std::swap(i, j);
        }
        if (i >= m_rowCount || j >= m_columnCount) {
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
        if (i >= m_rowCount || j >= m_columnCount) {
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

    void optimizeWholeMatrix() {for (size_t i=0; i<m_rowCount; ++i) optimizeRow(i);}

private:

    // `n` = number of rows = number of cols
    const size_t m_rowCount; 
    const size_t m_columnCount;
    std::vector<SparseArray<T, AutoOptimizing>> m_sparseMatrixData;

};

}

#endif 