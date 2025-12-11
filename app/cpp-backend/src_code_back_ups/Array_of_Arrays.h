#ifndef DATA_STRUCTURES__ARRAY_OF_ARRAYS_H
#define DATA_STRUCTURES__ARRAY_OF_ARRAYS_H

#include <memory>
#include <vector>
#include <variant>
#include <stdexcept>
#include <numeric>
#include <cstring>

namespace data_structures {

using size_t = std::size_t;

// This function is not immune to undefined behaviour.
// The responsibility of keeping everything safe lies on the developer.
template <typename T>
T* templatedMemcpy(T* dest, T* source, size_t numToCopy) {
    return std::memcpy(
        static_cast<void*>(dest), 
        static_cast<void*>(source), 
        sizeof(T) * numToCopy
    );
} 


// TODO: change to allow dynamic resizing (if there is a need to for it)
// A data structure optimized for cache transfer and random access which holds m arrays storing elements of type T.
// All sizes of the arrays must be known at construction time ([`n1`, `n2`, ..., `nm`]).
// Resizing after creation is not possible unless sufficient additional memory was allocated at creation time with `s` or`maxSize`.
template <typename T>
class ArrayOfArrays {

public: 

    enum class AddOrMaxSize : uint8_t {
        ADD_SIZE = 0,
        MAX_SIZE = 1
    };

    // This class has different naming convention that the rest of the written code 
    // in order to imitate STL containers (namely std::vector).
    // This class does not own the memory it points to.
    class NestedArrayView {
    
    public:
    
        friend ArrayOfArrays;
        NestedArrayView() = delete;

        const T& operator[](size_t i) const {
            return const_cast<NestedArrayView*>(this)->operator[](i);
        }

        T& operator[](size_t i) {
            if (i >= m_size) {
                throw std::runtime_error{
                    "Nested Array View error: index larger than size"
                };
            }
            return m_arrInMemory[i];
        }

        void push_back(const T& t) {
            if (m_size == m_maxSize) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to push back at max capacity"
                };
            }
            m_arrInMemory[m_size] = t;
            m_owner->resize(m_nestedArrIndex, m_size+1);
        }

        void push_back(T&& t) {
            if (m_size == m_maxSize) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to push back at max capacity"
                };
            }
            m_arrInMemory[m_size] = std::move(t);
            m_owner->resize(m_nestedArrIndex, m_size+1);
        }

        template <typename... Args>
        T& emplace_back(Args&&... args) {
            if (m_size == m_maxSize) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to push back at max capacity"
                };
            } 
            m_arrInMemory[m_size] = T(std::forward<Args>(args)...);
            m_owner->resize(m_nestedArrIndex, m_size+1);
            return m_arrInMemory[m_size];
        }

        T& operator=(const std::vector<T>& vec) {
            if (vec.size() > max_size()) { // for now it does not allow resizing
                throw std::runtime_error{
                    "Nested Array View error: attempting to assign vector that is too big"
                };
            }
            templatedMemcpy<T>(m_arrInMemory, vec.data(), vec.size());
            return *this;
        }

        // Do note that `m_size` elements will be copied.
        T& operator=(T* arr) {
            templatedMemcpy<T>(m_arrInMemory, arr, m_size);
            return *this;
        }

        inline size_t size() const {return m_size;}
        inline size_t max_size() const {return m_maxSize;}
        inline void resize(size_t newSize) {
            if (newSize >= max_size()) { // for now, as the class currently does not support dynamic resizing
                throw std::runtime_error{
                    "Nested Array View error: resizing would breach max size"
                };
            } else {
                m_owner->resize(m_nestedArrIndex, newSize);
            }   
        }

        // If this method throws an error it should be treated as fatal.
        void erase(size_t index) {
            if (index >= m_size) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to erase at index " +
                    std::to_string(index) + ", while the size is " + std::to_string(m_size)
                };
            }
            // if (index == --m_size) return; // if the index is at last element just decrease the size
            if (index != m_size-1) {
                templatedMemcpy<T>(m_arrInMemory + index, m_arrInMemory + index + 1, m_size - 1 - index);
            }
            m_owner->resize(m_nestedArrIndex, m_size-1);
        }

        // A good method of efficient erasing if the order of elements is unimportant.
        // Swaps elements at `index` and `m_size-1` and then erases the last element.
        void eraseBySwappingWithLast(size_t index) {
            if (index >= m_size) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to erase at index " +
                    std::to_string(index) + ", while the size is " + std::to_string(m_size)
                };
            }
            // if (index == --m_size) return;
            std::swap(m_arrInMemory[index], m_arraysOfTsSizes[m_size-1]);
            m_owner->resize(m_nestedArrIndex, m_size-1);
        }

    private:    

        // This constructor should only ever be called by the ArrayOfArrays class methods.
        NestedArrayView(ArrayOfArrays* owner, size_t nestedArrIndex, T* arrInMemory, size_t& size, size_t maxSize) :
            m_owner{owner}, m_nestedArrIndex{nestedArrIndex}, m_arrInMemory{arrInMemory}, m_size{size} {

            if (m_arrInMemory == nullptr) {
                throw std::runtime_error{
                    "Nested Array View error: passed memory address is nullptr"
                };
            } else if (m_owner == nullptr) {
                throw std::runtime_error{
                    "Nested Array View error: passed owner is nullptr"
                };
            }
        }
    
        ArrayOfArrays* m_owner;
        size_t m_nestedArrIndex;
        T* m_arrInMemory;
        size_t& m_size;
        size_t m_maxSize;
    };

    // TODO: add constructors with std::vector<size_t>&& types to improve efficiency.
    
    ArrayOfArrays(const ArrayOfArrays<T>& otherArrayOfArrays) :
        m_arraysOfTsSizes{otherArrayOfArrays.m_arraysOfTsSizes}, 
        m_memoryOffsets{otherArrayOfArrays.m_memoryOffsets}, 
        m_maxSizesStorage{otherArrayOfArrays.m_maxSizesStorage} {

        size_t requiredSize = 0;
        if (!m_maxSizesStorage.allowsAddSizes()) {
            requiredSize = std::accumulate(
                m_arraysOfTsSizes.begin(), m_arraysOfTsSizes.end(), 0
            );
        } else {
            size_t n = m_arraysOfTsSizes.size();
            for (size_t arrIndex=0; arrIndex<n; ++arrIndex) {
                requiredSize += m_maxSizesStorage.checkMaxSizeForArray(arrIndex);
            }
        }
        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
    }

    ArrayOfArrays(ArrayOfArrays<T>&& otherArrayOfArrays) :
        m_arraysOfTsSizes{std::move(otherArrayOfArrays.m_arraysOfTsSizes)}, 
        m_memoryOffsets{std::move(otherArrayOfArrays.m_memoryOffsets)}, 
        m_maxSizesStorage{std::move(otherArrayOfArrays.m_maxSizesStorage)} {

        m_linearizedMemory = otherArrayOfArrays.m_linearizedMemory;
        otherArrayOfArrays.m_linearizedMemory = nullptr;
    }

    ArrayOfArrays(const std::vector<size_t>& arraysOfTsSizes) : 
        m_arraysOfTsSizes{arraysOfTsSizes}, m_maxSizesStorage{nullptr} {

        size_t requiredSize = std::accumulate(m_arraysOfTsSizes.begin(), m_arraysOfTsSizes.end(), 0);
        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
        initializeMemoryOffsetsField();
    }

    ArrayOfArrays(const std::vector<size_t>& arraysOfTsSizes, size_t s, AddOrMaxSize sType = AddOrMaxSize::ADD_SIZE) :
        m_arraysOfTsSizes{arraysOfTsSizes}, m_maxSizesStorage{nullptr} {

        size_t requiredSize;
        if (sType == AddOrMaxSize::MAX_SIZE) {
            for (size_t i=0; i<m_arraysOfTsSizes.size(); ++i) {
                size_t startingSizeI = m_arraysOfTsSizes[i];
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
            requiredSize = s*m_arraysOfTsSizes.size();
            m_maxSizesStorage = MaxSizesStorage{s};
        } else if (sType == AddOrMaxSize::ADD_SIZE) {
            requiredSize = std::accumulate(
                m_arraysOfTsSizes.begin(), 
                m_arraysOfTsSizes.end(), 
                s*m_arraysOfTsSizes.size()
            );
            std::vector<size_t> maxSizes = m_arraysOfTsSizes;
            for (auto& maxSizeI : maxSizes) maxSizeI += s;
            m_maxSizesStorage = MaxSizesStorage{std::move(maxSizes)};
        } else {
            throw std::runtime_error{"Arrays Of Arrays error: unknown sType"};
        }

        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
        initializeMemoryOffsetsField();
    }

    ArrayOfArrays(const std::vector<size_t>& arraysOfTsSizes, const std::vector<size_t>& maxSizes) :
        m_arraysOfTsSizes{arraysOfTsSizes}, m_maxSizesStorage{maxSizes} {

        if (m_arraysOfTsSizes.size() != m_maxSizesStorage.size()) {
            throw std::runtime_error{
                "Arrays Of Arrays error: size mismatch between arrays passed to constructor"
            };
        }
        size_t requiredSize = 0;
        for (size_t i=0; i<m_arraysOfTsSizes.size(); ++i) {
            if (m_arraysOfTsSizes[i] > maxSizes[i]) {
                throw std::runtime_error{
                    "Arrays Of Arrays error: starting size at " +
                    std::to_string(i) + " exceeds its allowed max size"
                };
            }
            requiredSize += maxSizes[i];
        }

        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
        initializeMemoryOffsetsField();
    }

    ArrayOfArrays<T>& operator=(const ArrayOfArrays<T>& otherArrayOfArrays) {
        if (this == otherArrayOfArrays) return;
        if (m_linearizedMemory != nullptr) {
            free(m_linearizedMemory);
        }
        m_arraysOfTsSizes = otherArrayOfArrays.m_arraysOfTsSizes;
        m_memoryOffsets = otherArrayOfArrays.m_memoryOffsets;
        m_maxSizesStorage = otherArrayOfArrays.m_maxSizesStorage;
        size_t requiredSize = 0;
        if (!m_maxSizesStorage.allowsAddSizes()) {
            requiredSize = std::accumulate(
                m_arraysOfTsSizes.begin(), m_arraysOfTsSizes.end(), 0
            );
        } else {
            size_t n = m_arraysOfTsSizes.size();
            for (size_t arrIndex=0; arrIndex<n; ++arrIndex) {
                requiredSize += m_maxSizesStorage.checkMaxSizeForArray(arrIndex);
            }
        }
        m_linearizedMemory = static_cast<T*>(malloc(requiredSize * sizeof(T)));
        return *this;
    }

    ArrayOfArrays<T&> operator=(ArrayOfArrays<T>&& otherArrayOfArrays) {
        if (this == otherArrayOfArrays) return;
        if (m_linearizedMemory != nullptr) {
            free(m_linearizedMemory);
        }
        m_arraysOfTsSizes = std::move(otherArrayOfArrays.m_arraysOfTsSizes);
        m_memoryOffsets = std::move(otherArrayOfArrays.m_memoryOffsets);
        m_maxSizesStorage = std::move(otherArrayOfArrays.m_maxSizesStorage);
        m_linearizedMemory = otherArrayOfArrays.m_linearizedMemory;
        otherArrayOfArrays.m_linearizedMemory = nullptr;
        return *this;
    }

    inline size_t getSizeOfArr(size_t arrIndex) const {
        if (arrIndex >= m_arraysOfTsSizes.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: array index too large"
            };
        }
        return m_arraysOfTsSizes[arrIndex];
    }

    inline size_t getMaxSizeOfArr(size_t arrIndex) const {
        if (arrIndex >= m_arraysOfTsSizes.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: array index too large"
            };
        }
        if (!m_maxSizesStorage.allowsAddSizes()) return m_arraysOfTsSizes[arrIndex];
        return m_maxSizesStorage.checkMaxSizeForArray(arrIndex);
    }

    NestedArrayView getNestedArrayView(size_t arrIndex) {
        if (arrIndex >= m_arraysOfTsSizes.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: arrIndex " + 
                std::to_string(arrIndex) + " is too large"
            };
        }
        return NestedArrayView(this, arrIndex, m_linearizedMemory + m_memoryOffsets[arrIndex], m_arraysOfTsSizes[arrIndex], getMaxSizeOfArr(arrIndex));
    }

    void resize(size_t arrIndex, size_t arrNewSize) {
        assertMaxSizeNotExceeded(arrIndex, arrNewSize);
        if (!m_maxSizesStorage.allowsAddSizes()) {
            m_maxSizesStorage = MaxSizesStorage(m_arraysOfTsSizes);
        }
        m_arraysOfTsSizes[arrIndex] = arrNewSize;
    }

    void resize(const std::vector<size_t>& newSizes) {
        if (newSizes.size() != m_arraysOfTsSizes.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: vector size mismatch when attempting to call resizing method"
            };
        }
        if (m_maxSizesStorage.allowsAddSizes()) {
            for (size_t i=0; i<newSizes.size(); ++i) {
                assertMaxSizeNotExceeded(i, newSizes[i]);
                m_arraysOfTsSizes[i] = newSizes[i];
            }
        } else {
            bool shouldChangeMaxSizeStorage = false;
            for (size_t i=0; i<newSizes.size(); ++i) {
                assertMaxSizeNotExceeded(i, newSizes[i]);
                if (!shouldChangeMaxSizeStorage && m_arraysOfTsSizes[i] < newSizes[i]) {
                    shouldChangeMaxSizeStorage = true;
                }
            }
            m_maxSizesStorage = MaxSizesStorage(m_arraysOfTsSizes);
            for (size_t i=0; i<newSizes.size(); ++i) {
                m_arraysOfTsSizes[i] = newSizes[i];
            }
        }
    }

    void resize(const std::vector<std::pair<size_t, size_t>>& newSizes) {
        for (const auto [arrIndex, arrNewSize] : newSizes) {
            if (arrIndex >= m_arraysOfTsSizes.size()) {
                throw std::runtime_error{
                    "Array Of Arrays error: arrIndex" + 
                    std::to_string(arrIndex) + " is too large"
                };
            }
            assertMaxSizeNotExceeded(arrIndex, arrNewSize);
        }
        if (m_maxSizesStorage.allowsAddSizes()) {
            for (const auto [arrIndex, arrNewSize] : newSizes) {
                m_arraysOfTsSizes[arrIndex] = arrNewSize;
            }
        } else {
            bool shouldChangeMaxSizeStorage = false;
            for (const auto [arrIndex, arrNewSize] : newSizes) {
                if (!shouldChangeMaxSizeStorage && arrNewSize < m_arraysOfTsSizes[arrIndex]) {
                    shouldChangeMaxSizeStorage = true;
                }
            }
            m_maxSizesStorage = MaxSizesStorage(m_arraysOfTsSizes);
            for (const auto [arrIndex, arrNewSize] : newSizes) {
                m_arraysOfTsSizes[arrIndex] = arrNewSize;
            }
        }
    }

private:

    // Initialzied with an object of type `nullptr_t` stores information that no addditional space has been allocated.
    struct MaxSizesStorage : public std::variant<nullptr_t, size_t, std::vector<size_t>> {
        using BaseClass = std::variant<void, size_t, std::vector<size_t>>;

        MaxSizesStorage() = delete;
        MaxSizesStorage(nullptr_t) : BaseClass{nullptr} {}
        MaxSizesStorage(size_t universalMaxSize) : BaseClass{universalMaxSize} {}
        MaxSizesStorage(const std::vector<size_t>& maxSizes) : BaseClass{maxSizes} {}
        MaxSizesStorage(std::vector<size_t>&& maxSizes) : BaseClass{std::move(maxSizes)} {}

        inline bool allowsAddSizes() const {return !std::holds_alternative<nullptr_t>(*this);}
        
        // Calling this functon when it stores `nullptr_t` can lead to undefined behaviour.
        // Always check if the object stores `nullptr_t` with `allowsAddSizes` method beforehand.
        inline size_t checkMaxSizeForArray(size_t arrIndex) const {
            void* vp = nullptr;
            if ((vp = (void*) std::get_if<size_t>(*this)) != nullptr) {
                return *((size_t*) vp);
            } else if ((vp = (void*) std::get_if<std::vector<size_t>>(*this)) != nullptr) {
                return ((std::vector<size_t>*) vp)->operator[](arrIndex);
            }
            throw std::runtime_error{
                "Max Sizes Storage error: stored type does not allow max size checking"
            };
        }

    };

    void initializeMemoryOffsetsField() {
        size_t n = m_arraysOfTsSizes.size();
        bool addSizesAllowed = m_maxSizesStorage.allowsAddSizes();
        m_memoryOffsets = std::vector<size_t>(n, 0);
        for (size_t arrIndex=1; arrIndex<n; ++arrIndex) {
            m_memoryOffsets[arrIndex] = m_memoryOffsets[arrIndex-1] + (addSizesAllowed
                ? m_maxSizesStorage.checkMaxSizeForArray[arrIndex]
                : m_arraysOfTsSizes[arrIndex]
            );
        }
    }

    void assertMaxSizeNotExceeded(size_t arrIndex, size_t newSize) {
        if (arrIndex >= m_arraysOfTsSizes.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: array index too large"
            };
        }
        bool addSizeAllowed = m_maxSizesStorage.allowsAddSizes();
        if (!addSizeAllowed && m_arraysOfTsSizes[arrIndex] < newSize) {
            throw std::runtime_error{
                "Array Of Arrays error: resizing array at index" + 
                std::to_string(arrIndex) + " would result in exceeding its max size"
            };
        } else if (addSizeAllowed) {
            size_t arrMaxSize = m_maxSizesStorage.checkMaxSizeForArray(arrIndex);
            if (arrMaxSize < newSize) {
                throw std::runtime_error{
                    "Array Of Arrays error: resizing array at index " + 
                    std::to_string(arrIndex) + " would result in exceeding its max size"
                };
            }
        }
    }

    T* m_linearizedMemory = nullptr;
    std::vector<size_t> m_arraysOfTsSizes;
    std::vector<size_t> m_memoryOffsets;
    MaxSizesStorage m_maxSizesStorage;

};

}

#endif