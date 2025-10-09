#ifndef DATA_STRUCTURES__ARRAY_OF_ARRAYS_OF_INTERFACE_H
#define DATA_STRUCTURES__ARRAY_OF_ARRAYS_OF_INTERFACE_H

#include <memory>
#include <vector>
#include <variant>
#include <stdexcept>
#include <numeric>
#include <cstring>
#include <iostream>

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

// forward declaration of ArrayOfArraysView to avoid circular dependencies

template <typename T>
class ArrayOfArraysView;

// TODO: change to allow dynamic resizing (if there is a need to for it)
// A data structure optimized for cache transfer and random access which holds m arrays storing elements of type T.
// All sizes of the arrays must be known at construction time ([`n1`, `n2`, ..., `nm`]).
// Resizing after creation is not possible unless sufficient additional memory was allocated at creation time with `s` or`maxSize`.
// 
// This is an interface (a pure virtual) class, which has everything implemented except for memory management.
template <typename T>
class ArrayOfArraysInterface {

public: 

    // This class has different naming convention that the rest of the written code 
    // in order to imitate STL containers (namely std::vector).
    // This class does not own the memory it points to.
    class NestedArrayView {
    
    public:
    
        friend ArrayOfArraysInterface;
        NestedArrayView() = delete;
        // NestedArrayView(const NestedArrayView& otherNestedArrayView) :
        //     m_owner{otherNestedArrayView.m_owner}, 
        //     m_nestedArrIndex{otherNestedArrayView.m_nestedArrIndex}, 
        //     m_arrInMemory{otherNestedArrayView.m_arrInMemory}, 
        //     m_size{otherNestedArrayView.m_size}, 
        //     m_maxSize{otherNestedArrayView.m_maxSize} {}

        // NestedArrayView& operator=(const NestedArrayView& otherNestedArrayView) {
        // }

        const T& operator[](size_t i) const {
            return const_cast<NestedArrayView*>(this)->operator[](i);
        }

        T& operator[](size_t i) {
            if (i >= *m_sizePtr) {
                throw std::runtime_error{
                    "Nested Array View error: index larger than size"
                };
            }
            return m_arrInMemory[i];
        }

        void push_back(const T& t) {
            size_t size = *m_sizePtr;
            if (size == m_maxSize) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to push back at max capacity"
                };
            }
            m_arrInMemory[size] = t;
            m_owner->resize(m_nestedArrIndex, size+1);
        }

        void push_back(T&& t) {
            size_t size = *m_sizePtr;
            if (size == m_maxSize) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to push back at max capacity"
                };
            }
            m_arrInMemory[size] = std::move(t);
            m_owner->resize(m_nestedArrIndex, size+1);
        }

        template <typename... Args>
        T& emplace_back(Args&&... args) {
            size_t size = *m_sizePtr;
            if (size == m_maxSize) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to push back at max capacity"
                };
            } 
            m_arrInMemory[size] = T(std::forward<Args>(args)...);
            m_owner->resize(m_nestedArrIndex, size+1);
            return m_arrInMemory[size];
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
            templatedMemcpy<T>(m_arrInMemory, arr, *m_sizePtr);
            return *this;
        }

        inline size_t size() const {return *m_sizePtr;}
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
            size_t size = *m_sizePtr;
            if (index >= size) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to erase at index " +
                    std::to_string(index) + ", while the size is " + std::to_string(size)
                };
            }
            // if (index == --m_size) return; // if the index is at last element just decrease the size
            if (index != size-1) {
                templatedMemcpy<T>(m_arrInMemory + index, m_arrInMemory + index + 1, size - 1 - index);
            }
            m_owner->resize(m_nestedArrIndex, size-1);
        }

        // A good method of efficient erasing if the order of elements is unimportant.
        // Swaps elements at `index` and `m_size-1` and then erases the last element.
        void eraseBySwappingWithLast(size_t index) {
            size_t size = *m_sizePtr;
            if (index >= size) {
                throw std::runtime_error{
                    "Nested Array View error: attempting to erase at index " +
                    std::to_string(index) + ", while the size is " + std::to_string(size)
                };
            }
            // if (index == --m_size) return;
            // auto& arrInMemoryValue = *m_arrInMemory;
            std::swap(m_arrInMemory[index], m_arrInMemory[size-1]);
            m_owner->resize(m_nestedArrIndex, size-1);
        }

    private:    

        // This constructor should only ever be called by the ArrayOfArraysInterface class methods.
        NestedArrayView(ArrayOfArraysInterface* owner, size_t nestedArrIndex, T* arrInMemory, size_t& size, size_t maxSize) :
            m_owner{owner}, m_nestedArrIndex{nestedArrIndex}, m_arrInMemory{arrInMemory}, m_sizePtr{&size}, m_maxSize{maxSize} {

            if (m_arrInMemory == nullptr) {
                throw std::runtime_error{
                    "Nested Array View error: passed memory address is nullptr"
                };
            } else if (m_owner == nullptr) {
                throw std::runtime_error{
                    "Nested Array View error: passed owner is nullptr"
                };
            } else if (m_sizePtr == nullptr) {
                throw std::runtime_error{
                    "Nested Array View error: passed size ptr is nullptr"
                };
            }
        }
    
        ArrayOfArraysInterface* m_owner;
        size_t m_nestedArrIndex;
        T* m_arrInMemory;
        size_t* m_sizePtr;
        size_t m_maxSize;
    };

    // TODO: add constructors with std::vector<size_t>&& types to improve efficiency.

    ArrayOfArraysInterface(const std::vector<size_t>& arraysOfTsSizes) : 
        m_arraysOfTsSizes{new std::vector<size_t>(arraysOfTsSizes)}, 
        m_maxSizesStorage{new MaxSizesStorage(nullptr)} {}

    ArrayOfArraysInterface(const std::vector<size_t>& arraysOfTsSizes, const std::vector<size_t>& maxSizes) :
        m_arraysOfTsSizes{new std::vector<size_t>(arraysOfTsSizes)}, 
        m_maxSizesStorage{new MaxSizesStorage(maxSizes)} {}

    inline size_t getNumberOfNestedArrays() const {
        return m_arraysOfTsSizes->size();
    }    

    inline size_t getSizeOfArr(size_t arrIndex) const {
        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        if (arrIndex >= arraysOfTsSizesRef.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: array index too large"
            };
        }
        return arraysOfTsSizesRef[arrIndex];
    }

    inline size_t getMaxSizeOfArr(size_t arrIndex) const {
        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        if (arrIndex >= arraysOfTsSizesRef.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: array index too large"
            };
        }
        auto& maxSizesStorageRef = *m_maxSizesStorage;
        if (!maxSizesStorageRef.allowsAddSizes()) return arraysOfTsSizesRef[arrIndex];
        return maxSizesStorageRef.checkMaxSizeForArray(arrIndex);
    }

    NestedArrayView getNestedArrayView(size_t arrIndex) {
        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        if (arrIndex >= arraysOfTsSizesRef.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: arrIndex" + 
                std::to_string(arrIndex) + " is too large"
            };
        }
        // std::cout << "Arr index: " << arrIndex << " " << &arraysOfTsSizesRef[arrIndex] << "\n";
        return NestedArrayView(this, arrIndex, m_linearizedMemory + (*m_memoryOffsets)[arrIndex], arraysOfTsSizesRef[arrIndex], getMaxSizeOfArr(arrIndex));
    }

    void resize(size_t arrIndex, size_t arrNewSize) {
        assertMaxSizeNotExceeded(arrIndex, arrNewSize);
        if (!m_maxSizesStorage->allowsAddSizes()) {
            delete m_maxSizesStorage;
            m_maxSizesStorage = new MaxSizesStorage(*m_arraysOfTsSizes);
        }
        (*m_arraysOfTsSizes)[arrIndex] = arrNewSize;
    }

    void resize(const std::vector<size_t>& newSizes) {
        auto& arrayOfTsSizesRef = *m_arraysOfTsSizes;
        if (newSizes.size() != arrayOfTsSizesRef.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: vector size mismatch when attempting to call resizing method"
            };
        }
        if (m_maxSizesStorage->allowsAddSizes()) {
            for (size_t i=0; i<newSizes.size(); ++i) {
                assertMaxSizeNotExceeded(i, newSizes[i]);
                arrayOfTsSizesRef[i] = newSizes[i];
            }
        } else {
            bool shouldChangeMaxSizeStorage = false;
            for (size_t i=0; i<newSizes.size(); ++i) {
                assertMaxSizeNotExceeded(i, newSizes[i]);
                if (!shouldChangeMaxSizeStorage && arrayOfTsSizesRef[i] < newSizes[i]) {
                    shouldChangeMaxSizeStorage = true;
                }
            }
            delete m_maxSizesStorage;
            m_maxSizesStorage = new MaxSizesStorage(arrayOfTsSizesRef);
            for (size_t i=0; i<newSizes.size(); ++i) {
                arrayOfTsSizesRef[i] = newSizes[i];
            }
        }
    }

    void resize(const std::vector<std::pair<size_t, size_t>>& newSizes) {
        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        for (const auto [arrIndex, arrNewSize] : newSizes) {
            if (arrIndex >= arraysOfTsSizesRef.size()) {
                throw std::runtime_error{
                    "Array Of Arrays error: arrIndex" + 
                    std::to_string(arrIndex) + " is too large"
                };
            }
            assertMaxSizeNotExceeded(arrIndex, arrNewSize);
        }
        if (m_maxSizesStorage->allowsAddSizes()) {
            for (const auto [arrIndex, arrNewSize] : newSizes) {
                m_arraysOfTsSizes[arrIndex] = arrNewSize;
            }
        } else {
            bool shouldChangeMaxSizeStorage = false;
            for (const auto [arrIndex, arrNewSize] : newSizes) {
                if (!shouldChangeMaxSizeStorage && arrNewSize < arraysOfTsSizesRef[arrIndex]) {
                    shouldChangeMaxSizeStorage = true;
                }
            }
            delete m_maxSizesStorage;
            m_maxSizesStorage = MaxSizesStorage(arraysOfTsSizesRef);
            for (const auto [arrIndex, arrNewSize] : newSizes) {
                arraysOfTsSizesRef[arrIndex] = arrNewSize;
            }
        }
    }

    // Returns a view class, which does not own its data.
    // For more details see `ArrayOfArraysView<T>` class.
    ArrayOfArraysView<T> getArrayOfArraysView();

    // A pure virtual destructor that is fully implemented. This is why C++ is beautiful.
    virtual ~ArrayOfArraysInterface() = 0;

protected:

    ArrayOfArraysInterface() {}

    // Initialzied with an object of type `nullptr_t` stores information that no addditional space has been allocated.
    struct MaxSizesStorage : public std::variant<nullptr_t, size_t, std::vector<size_t>> {
        using BaseClass = std::variant<nullptr_t, size_t, std::vector<size_t>>;

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
            if ((vp = (void*) std::get_if<size_t>(this)) != nullptr) {
                return *((size_t*) vp);
            } else if ((vp = (void*) std::get_if<std::vector<size_t>>(this)) != nullptr) {
                return ((std::vector<size_t>*) vp)->operator[](arrIndex);
            }
            throw std::runtime_error{
                "Max Sizes Storage error: stored type does not allow max size checking"
            };
        }

    };

    void assertMaxSizeNotExceeded(size_t arrIndex, size_t newSize) {
        auto& arraysOfTsSizesRef = *m_arraysOfTsSizes;
        if (arrIndex >= arraysOfTsSizesRef.size()) {
            throw std::runtime_error{
                "Array Of Arrays error: array index too large"
            };
        }
        bool addSizeAllowed = m_maxSizesStorage->allowsAddSizes();
        if (!addSizeAllowed && arraysOfTsSizesRef[arrIndex] < newSize) {
            throw std::runtime_error{
                "Array Of Arrays error: resizing array at index" + 
                std::to_string(arrIndex) + " would result in exceeding its max size"
            };
        } else if (addSizeAllowed) {
            size_t arrMaxSize = m_maxSizesStorage->checkMaxSizeForArray(arrIndex);
            if (arrMaxSize < newSize) {
                throw std::runtime_error{
                    "Array Of Arrays error: resizing array at index " + 
                    std::to_string(arrIndex) + " would result in exceeding its max size"
                };
            }
        }
    }

    T* m_linearizedMemory = nullptr;
    std::vector<size_t>* m_arraysOfTsSizes = nullptr;
    std::vector<size_t>* m_memoryOffsets = nullptr;
    MaxSizesStorage* m_maxSizesStorage = nullptr;

};   

template <typename T> ArrayOfArraysInterface<T>::~ArrayOfArraysInterface() = default; 

}

#endif