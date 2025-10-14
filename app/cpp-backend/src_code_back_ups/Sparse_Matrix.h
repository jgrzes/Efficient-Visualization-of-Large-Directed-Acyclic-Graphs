#ifndef DATA_STRUCTURES__SPARSE_SYMMETRIC_MATRIX
#define DATA_STRUCTURES__SPARSE_SYMMETRIC_MATRIX

#include <tuple>
#include <vector>
#include <unordered_map>
#include <variant>
#include <stdexcept>
#include <optional>

#include "../utils/Counting_Allocator.h"

using size_t = std::size_t;

namespace data_structures {

template <typename T, bool Symmetric = true, bool AutoOptimizng = true>
class SparseMatrix {

public:

    template <typename R>
    using CountingAllocator = utils::CountingAllocator<R>;
    using CountingUnorderedMap = std::unordered_map<size_t, T, std::hash<size_t>, std::equal_to<size_t>, CountingAllocator<std::pair<size_t, T>>>;

    // Sparse vector container, different naming convention to resemble STl containers.
    class RowData : public std::variant<std::vector<std::optional<T>>, CountingUnorderedMap> {

    public:

        // friend SparseMatrix;
    
        using BaseClass = std::variant<std::vector<std::optional<T>>, CountingUnorderedMap>;

        RowData() = delete;
        RowData(const size_t n) : BaseClass{CountingUnorderedMap()}, m_logicalSize{n} {}

        size_t size() const {return m_logicalSize;}

        // If we try to access a zero-like cell of a sparse matrix from const context, 
        // we can immediately return `T{}`.
        const T& operator[](size_t i) const {
            // if (CountingUnorderedMap* castedToMapPtr = std::get_if<CountingUnorderedMap>(static_cast<const BaseClass*>(this);)
            //     castedToMapPtr != nullptr && castedToMapPtr->find(i) == castedToMapPtr->end()) {

            //     return T{};    
            // }
            return const_cast<const T&>(
                const_cast<T&>(*this)[i]
            );
        }

        T& operator[](size_t i) {
            if (std::holds_alternative<CountingUnorderedMap>(static_cast<BaseClass&>(*this))) {
                auto& castedToMap = std::get<CountingUnorderedMap>(
                    static_cast<BaseClass&>(*this)
                );
                if (castedToMap.find(i) == castedToMap.end()) {
                    castedToMap[i]; 
                    // if (sizeof(castedToMap) >= m_logicalSize * sizeof(T)) { // rough estimate of when storing in vector becomes more efficient than hashing
                    size_t bytesAllocated = castedToMap.get_allocator().getAllocatedBytes();
                    if (bytesAllocated >= m_logicalSize * sizeof(std::optional<T>) && AutoOptimizng) { // rough estimate of when storing in vector becomes more efficient than hashing
                        transformFromMapToVector();
                    } else {
                        return castedToMap[i];
                    }
                } else {
                    return castedToMap[i];
                }
            }

            auto& castedToVector = std::get<std::vector<std::optional<T>>>(
                static_cast<BaseClass&>(*this)
            );
            if (!castedToVector[i].has_value()) castedToVector[i].emplace();
            return castedToVector[i].value();
        }

    private:

        void transformFromMapToVector() {
            std::vector<std::optional<T>> rowDataAsVector(m_logicalSize, std::nullopt);
            auto& castedToMap = std::get<CountingUnorderedMap>(
                static_cast<BaseClass&>(*this)
            );
            for (const auto& [i, t] : castedToMap) {
                rowDataAsVector[i] = std::move(t);
            }
            // *this = BaseClass::operator=(std::move(rowDataAsVector));
            BaseClass::operator=(std::move(rowDataAsVector));
        }

        void optimize() {
            if (std::get_if<std::vector<std::optional<T>>>(static_cast<BaseClass*>(this)) != nullptr) {
                return;
            }
            auto& castedMap = std::get<CountingUnorderedMap>(static_cast<BaseClass&>(*this));
            size_t bytesAllocated = castedMap.get_allocator().getAllocatedBytes();
            if (bytesAllocated >= m_logicalSize * sizeof(T)) {
                transformFromMapToVector();
            }
        }

        const size_t m_logicalSize;

    };

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
        // size_t a, b;
        // a = std::min(i, j);
        // b = std::max(i, j);
        return m_sparseMatrixData[i][j];
    }

    // Checks if the `a_ij` is one of the zero-like cells.
    // If the vector is 
    bool containsData(size_t i, size_t j) const {
        if constexpr (Symmetric) {
            if (i > j) std::swap(i, j);
        }
        // size_t a, b;
        // a = std::min(i, j);
        // b = std::max(i, j);
        const RowData& rowI = m_sparseMatrixData[i];
        if (CountingUnorderedMap* rowACastedToMap = std::get_if<CountingUnorderedMap>(const_cast<RowData*>(&rowI));
            rowACastedToMap != nullptr) {

            return rowACastedToMap->find(j) != rowACastedToMap->end();
        }
        return (std::get<std::vector<std::optional<T>>>(rowI)[j]).has_value();
    }

    T dataAtOr(size_t i, size_t j, const T& t) {
        if (containsData(i, j)) return at(i, j);
        return t;
    }

    void optimizeRow(size_t i) {m_sparseMatrixData[i].optimize();}

    void optimizeWholeMatrix() {for (size_t i=0; i<m_n; ++i) optimizeRow(i);}

private:

    // `n` = number of rows = number of cols
    const size_t m_n; 
    std::vector<RowData> m_sparseMatrixData;

};

}

#endif 