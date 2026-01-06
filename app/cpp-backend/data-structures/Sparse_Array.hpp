#ifndef DATA_STRUCTURES__SPARSE_ARRAY_H
#define DATA_STRUCTURES__SPARSE_ARRAY_H

#include <vector>
#include <unordered_map>
#include <tuple>
#include <optional>
#include <variant>
#include <memory>
#include <stdexcept>

#include "../utils/Counting_Allocator.h"
#include "../logging/boost_logging.hpp"

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
class SparseArray {

public:

    using VariantT = std::variant<std::vector<std::optional<T>>, MemCountingMap<T>>;

    class Iterator {

        friend class SparseArray;

    private:
        
        Iterator() = delete;

        Iterator(std::vector<std::optional<T>>& vector) : 
            m_optVector{std::ref(vector)}, m_optMap{std::nullopt}, 
            m_optVectorIndex{0}, m_optMapIterator{std::nullopt} {

            size_t n = vector.size();
            while (m_optVectorIndex.value() < n && !vector[m_optVectorIndex.value()].has_value())  {
                ++(m_optVectorIndex.value());
            }
        }

        Iterator(MemCountingMap<T>& map) : 
            m_optVector{std::nullopt}, m_optMap{std::ref(map)},
            m_optVectorIndex{std::nullopt}, m_optMapIterator{map.begin()} {}

        Iterator(std::vector<std::optional<T>>& vector, size_t startingIndex) : 
            m_optVector{std::ref(vector)}, m_optMap{std::nullopt}, 
            m_optVectorIndex{startingIndex}, m_optMapIterator{std::nullopt} {
            
            size_t n = vector.size();
            while (m_optVectorIndex.value() < n && !vector[m_optVectorIndex.value()].has_value())  {
                ++(m_optVectorIndex.value());
            }   
        }

        Iterator(MemCountingMap<T>& map, const typename MemCountingMap<T>::iterator startingMapIterator) : 
            m_optVector{std::nullopt}, m_optMap{std::ref(map)},
            m_optVectorIndex{std::nullopt}, m_optMapIterator{startingMapIterator} {}

    public:

        Iterator& operator++() {
            if (m_optMap.has_value()) {
                ++(m_optMapIterator.value());
                return *this;
            }
            auto n = m_optVector.value().get().size();
            ++(m_optVectorIndex.value());
            while (m_optVectorIndex.value() != n && !m_optVector.value().get()[m_optVectorIndex.value()].has_value()) {
                ++(m_optVectorIndex.value());
            }
            return *this;
        }  
        
        Iterator operator++(int unused) {
            Iterator iteratorStateBeforeIncrementing(*this);
            if (m_optMap.has_value()) {
                ++(m_optMapIterator.value());
                return iteratorStateBeforeIncrementing;
            }
            auto n = m_optVector.value().get().size();
            ++(m_optVectorIndex.value());
            while (m_optVectorIndex.value() != n && !m_optVector.value().get()[m_optVectorIndex].has_value()) {
                ++(m_optVectorIndex.value());
            }
            return iteratorStateBeforeIncrementing;
        }

        bool operator==(const Iterator& otherIterator) const {
            if (m_optVector.has_value() != otherIterator.m_optVector.has_value()) {
                throw std::runtime_error{
                    "Sparse Array Iterator error: cannot compare iterators of different underlying type"
                };
            } else if (m_optVector.has_value() && &(m_optVector.value().get()) != &(otherIterator.m_optVector.value().get())) {
                return false;
            } else if (m_optMap.has_value() && &(m_optMap.value().get()) != &(otherIterator.m_optMap.value().get())) {
                return false;
            } else if (m_optVector.has_value()) {
                return m_optVectorIndex.value() == otherIterator.m_optVectorIndex.value();
            } else {
                return m_optMapIterator.value() == otherIterator.m_optMapIterator.value();
            }
        }

        bool operator!=(const Iterator& otherIterator) const {
            return !(operator==(otherIterator));
        }

        std::pair<size_t, T*> getIndexAndValuePtr() {
            if (m_optVector.has_value()) {
                return {
                    m_optVectorIndex.value(), 
                    &(m_optVector.value().get()[m_optVectorIndex.value()].value())
                };
            } else {
                return {
                    m_optMapIterator.value()->first, &(m_optMapIterator.value()->second)
                };
            }
        }

        T* operator->() {
            if (m_optVector.has_value()) return &m_optVector.value().get()[m_optVectorIndex.value()].value();
            else return &m_optMapIterator.value();
        }

        const T& operator*() const {
            return const_cast<T&>(
                const_cast<Iterator*>(this)->operator*()
            );
        }

        T& operator*() {
            if (m_optVector.has_value()) return m_optVector.value().get()[m_optVectorIndex.value()].value();
            else return m_optMapIterator.value();
        }

    private:

        std::optional<std::reference_wrapper<std::vector<std::optional<T>>>> m_optVector;
        std::optional<std::reference_wrapper<MemCountingMap<T>>> m_optMap;

        std::optional<size_t> m_optVectorIndex;
        std::optional<typename MemCountingMap<T>::iterator> m_optMapIterator;

    };

    SparseArray() = delete;
    SparseArray(const size_t n, const T& defaultValue = {}) : 
        m_variantDataStorage{MemCountingMap<T>()}, m_logicalN{n}, m_defaultValue{defaultValue} {}

    template <bool OtherAutoOptimizing>
    SparseArray(const SparseArray<T, OtherAutoOptimizing>& otherSparseArray) :
        m_variantDataStorage{otherSparseArray}, m_logicalN{otherSparseArray.m_logicalN}, m_defaultValue{otherSparseArray.m_defaultValue} {}

    template <bool OtherAutoOptimizing>
    SparseArray(SparseArray<T, OtherAutoOptimizing>&& otherSparseArray) :
        m_variantDataStorage{std::move(otherSparseArray)}, m_logicalN{otherSparseArray.m_logicalN}, m_defaultValue{otherSparseArray.m_defaultValue} {}    

    template <bool OtherAutoOptimizing>
    SparseArray<T, AutoOptimizing>& operator=(const SparseArray<T, OtherAutoOptimizing>& otherSparseArray) {
        m_variantDataStorage = otherSparseArray.m_variantDataStorage;
        m_defaultValue = otherSparseArray.m_defaultValue;
        m_logicalN = otherSparseArray.m_logicalN;
        return *this;
    }    

    template <bool OtherAutoOptimizing>
    SparseArray<T, AutoOptimizing>& operator=(SparseArray<T, OtherAutoOptimizing>&& otherSparseArray) {
        if (this == &otherSparseArray) return *this;
        m_variantDataStorage = std::move(otherSparseArray.m_variantDataStorage);
        m_defaultValue = std::move(otherSparseArray.m_defaultValue);
        m_logicalN = otherSparseArray.m_logicalN;
        otherSparseArray.m_logicalN = 0UL;
        return *this;
    } 

    T getDefaultValue() const {return m_defaultValue;}

    size_t size() const {return m_logicalN;}

    Iterator begin() {
        if (MemCountingMap<T>* castedToMapPtr = std::get_if<MemCountingMap<T>>(&m_variantDataStorage); 
            castedToMapPtr != nullptr) {

            return Iterator(*castedToMapPtr);
        } else {
            return Iterator(std::get<std::vector<std::optional<T>>>(m_variantDataStorage));
        }
    }

    Iterator end() {
        if (MemCountingMap<T>* castedToMapPtr = std::get_if<MemCountingMap<T>>(&m_variantDataStorage); 
            castedToMapPtr != nullptr) {

            return Iterator(*castedToMapPtr, castedToMapPtr->end());
        } else {
            auto& castedToVector = std::get<std::vector<std::optional<T>>>(m_variantDataStorage);
            return Iterator(castedToVector, castedToVector.size());
        }
    }

    const T& operator[](size_t i) const {
        return const_cast<const T&>(
            const_cast<SparseArray&>(*this)[i]
        );
    }

    T& operator[](size_t i) {
        if (MemCountingMap<T>* castedToMapPtr = std::get_if<MemCountingMap<T>>(&m_variantDataStorage);
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
        
        // std::string underlyingAlternative = "unknown";
        // if (std::holds_alternative<std::vector<std::optional<T>>>(m_variantDataStorage)) underlyingAlternative = "vector";
        // else if (std::holds_alternative<MemCountingMap<T>>(m_variantDataStorage)) underlyingAlternative = "map";
        // logging::log_trace(
        //     "(In " + std::to_string((size_t) (this)) + ") Underlying type is " 
        //     + underlyingAlternative + " and i = " + std::to_string(i)
        //     + " while m_logicalN = " + std::to_string(m_logicalN) + "."
        // );

        auto& castedToVector = std::get<std::vector<std::optional<T>>>(m_variantDataStorage);
        if (!castedToVector[i].has_value()) castedToVector[i] = m_defaultValue;
        return castedToVector[i].value();
    }

    bool hasDataAt(size_t i) const {
        MemCountingMap<T>* castedToMapPtr = std::get_if<MemCountingMap<T>>(
            &(const_cast<SparseArray<T, AutoOptimizing>*>(this)->m_variantDataStorage)
        );
        if (castedToMapPtr != nullptr) {
            return castedToMapPtr->find(i) != castedToMapPtr->end();
        }
        return (std::get<std::vector<std::optional<T>>>(m_variantDataStorage)[i]).has_value();
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
        if (std::holds_alternative<std::vector<std::optional<T>>>(m_variantDataStorage)) {
            return;
        }
        auto& castedToMap = std::get<MemCountingMap<T>>(m_variantDataStorage);
        size_t bytesAllocated = getAllocatedBytesInCaseOfMap();
        if (bytesAllocated >= m_logicalN * sizeof(std::optional<T>)) {
            transformFromMapToVector();
        }
    }

private:

    size_t getAllocatedBytesInCaseOfMap() const {
        return (std::get<MemCountingMap<T>>(
            m_variantDataStorage
        )).get_allocator().getAllocatedBytes();
    }

    void transformFromMapToVector() {
        // logging::log_debug("Transforming map to vector in sparse array object...");
        std::vector<std::optional<T>> rowDataAsVector(m_logicalN, std::nullopt);
        auto& castedToMap = std::get<MemCountingMap<T>>(
            static_cast<VariantT&>(m_variantDataStorage)
        );
        for (const auto& [i, t] : castedToMap) {
            rowDataAsVector[i] = std::move(t);
        }
        // BaseClass::operator=(std::move(rowDataAsVector));
        m_variantDataStorage.template emplace<std::vector<std::optional<T>>>(std::move(rowDataAsVector));
        auto castedToVectorPtr = std::get_if<std::vector<std::optional<T>>>(&m_variantDataStorage);
        // logging::log_debug(
        //     std::string("Transforming map to vector in sparse array object ")
        //     + (castedToVectorPtr != nullptr ? "succeeded." : "failed.")
        // );
    }

    VariantT m_variantDataStorage;
    size_t m_logicalN; 
    T m_defaultValue;

};

}

#endif