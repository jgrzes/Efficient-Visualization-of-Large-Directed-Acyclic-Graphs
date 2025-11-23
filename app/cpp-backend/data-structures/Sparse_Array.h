#ifndef DATA_STRUCTURES__SPARSE_ARRAY_H
#define DATA_STRUCTURES__SPARSE_ARRAY_H

#include <vector>
#include <unordered_map>
#include <tuple>
#include <optional>
#include <variant>

#include "../utils/Counting_Allocator.h"

namespace data_structures {

using size_t = std::size_t;

template <typename T>
using CountingAllocator = utils::CountingAllocator<T>;
template <typename T>
using MemCountingMap = std::unordered_map<size_t, T, std::hash<size_t>, std::equal_to<size_t>, utils::CountingAllocator<std::pair<size_t, T>>>;


// TODO: decide if should use `shared_ptr` to read memory and get a more precise read or use
// `mem_allocated` = `bucket_count` * `sizeof(void*)` + `size()` * (`sizeof(size_t)` + `sizeof(T)` + 2*`sizeof(void*)`)
// and get rougher read but in a more optimal way
template <typename T, bool AutoOptimizing = true>
class SparseArray : public std::variant<std::vector<std::optional<T>>, MemCountingMap<T>> {

public:

    using BaseClass = std::variant<std::vector<std::optional<T>>, MemCountingMap<T>>;

    SparseArray() = delete;
    SparseArray(const size_t n, const T& defaultValue = {}) : 
        BaseClass{MemCountingMap<T>()}, m_logicalN{n}, m_defaultValue{defaultValue} {}

    template <bool OtherAutoOptimizing>
    SparseArray<T, AutoOptimizing>& operator=(const SparseArray<T, OtherAutoOptimizing>& otherSparseArray) {
        BaseClass::operator=(static_cast<const BaseClass&>(otherSparseArray));
        m_defaultValue = otherSparseArray.m_defaultValue;
        const_cast<size_t&>(m_logicalN) = otherSparseArray.m_logicalN;
    }    

    template <bool OtherAutoOptimizing>
    SparseArray<T, AutoOptimizing>& operator=(SparseArray<T, OtherAutoOptimizing>&& otherSparseArray) {
        BaseClass::operator=(static_cast<const BaseClass&>(std::move(otherSparseArray)));
        m_defaultValue = std::move(otherSparseArray.m_defaultValue);
        const_cast<size_t&>(m_logicalN) = otherSparseArray.m_logicalN;
        const_cast<size_t&>(otherSparseArray.m_logicalN) = 0UL;
    } 

    size_t size() const {return m_logicalN;}

    const T& operator[](size_t i) const {
        return const_cast<const T&>(
            const_cast<SparseArray&>(*this)[i]
        );
    }

    T& operator[](size_t i) {
        if (MemCountingMap<T>* castedToMapPtr = std::get_if<MemCountingMap<T>>(static_cast<BaseClass*>(this));
            castedToMapPtr != nullptr) {

            auto& castedToMap = *castedToMapPtr;
            if (castedToMap.find(i) == castedToMap.end()) {
                castedToMap[i] = m_defaultValue;
                size_t bytesAllocated = getAllocatedBytesInCaseOfMap();
                if (bytesAllocated >= m_logicalN * sizeof(std::optional<T>) && AutoOptimizing) {
                    transformFromMapToVector();
                } else {
                    return castedToMap[i];
                }
            } else {
                return castedToMap[i];
            }
        }

        // std::cout << "Underlying type is vector " << std::holds_alternative<std::vector<std::optional<T>>>(*this) << "\n";
        // std::cout << i << ", while logical n is " << m_logicalN << "\n";
        auto& castedToVector = std::get<std::vector<std::optional<T>>>(static_cast<BaseClass&>(*this));
        if (!castedToVector[i].has_value()) castedToVector[i] = m_defaultValue;
        return castedToVector[i].value();
    }

    bool hasDataAt(size_t i) const {
        MemCountingMap<T>* castedToMapPtr = std::get_if<MemCountingMap<T>>(
            const_cast<BaseClass*>(
                static_cast<const BaseClass*>(this)
            )
        );
        if (castedToMapPtr != nullptr) {

            return castedToMapPtr->find(i) != castedToMapPtr->end();
        }
        return (std::get<std::vector<std::optional<T>>>(static_cast<const BaseClass&>(*this))[i]).has_value();
    }

    T dataAtOr(size_t i, const T& t) const {
        if (hasDataAt(i)) return operator[](i);
        return t;
    }

    T dataAtOr(size_t i, T&& t) const {
        if (hasDataAt(i)) return operator[](i);
        return std::move(t);
    }

    T dataAtOrDefault(size_t i) const {
        if (hasDataAt(i)) return operator[](i);
        return m_defaultValue;
    }

    void optimize() {
        if (std::holds_alternative<std::vector<std::optional<T>>>(static_cast<BaseClass&>(*this))) {
            return;
        }
        auto& castedToMap = std::get<MemCountingMap<T>>(static_cast<BaseClass&>(*this));
        size_t bytesAllocated = getAllocatedBytesInCaseOfMap();
        if (bytesAllocated >= m_logicalN * sizeof(std::optional<T>)) {
            transformFromMapToVector();
        }
    }

private:

    size_t getAllocatedBytesInCaseOfMap() const {
        return (std::get<MemCountingMap<T>>(
            static_cast<const BaseClass&>(*this)
        )).get_allocator().getAllocatedBytes();
    }

    void transformFromMapToVector() {
        // std::cout << "Transforming from map to vector...\n";
        std::vector<std::optional<T>> rowDataAsVector(m_logicalN, std::nullopt);
        auto& castedToMap = std::get<MemCountingMap<T>>(
            static_cast<BaseClass&>(*this)
        );
        for (const auto& [i, t] : castedToMap) {
            rowDataAsVector[i] = std::move(t);
        }
        BaseClass::operator=(std::move(rowDataAsVector));
        auto castedToVectorPtr = std::get_if<std::vector<std::optional<T>>>(static_cast<BaseClass*>(this));
        // std::cout << "Transforming " << (castedToVectorPtr != nullptr ? "succeeded" : "failed") << "\n";
    }

    const size_t m_logicalN; 
    T m_defaultValue;

};

}

#endif