#ifndef UTILS__COUNTING_ALLOCATOR_H
#define UTILS__COUNTINT_ALLOCATOR_H

#include <vector>
#include <memory>
#include <iostream>

namespace utils {

template <typename T>
class CountingAllocator : public std::allocator<T> {

public:

    using BaseClass = std::allocator<T>;
    using std::allocator<T>::allocator;
    using std::allocator<T>::allocate;
    using std::allocator<T>::deallocate;
    using value_type = T;

    // CountingAllocator() : BaseClass{}, m_bytesAllocatedPtr{std::make_shared<size_t>(0)} {
    //     std::cout << m_bytesAllocatedPtr << "\n";
    //     std::cout << *m_bytesAllocatedPtr << "\n\n";
    // }

    CountingAllocator() : BaseClass{} {
        std::cout << m_bytesAllocatedPtr << "\n";
        std::cout << *m_bytesAllocatedPtr << "\n\n";
    }

    template <typename R>
    CountingAllocator(const CountingAllocator<R>& otherAllocator) :
        BaseClass{} {m_bytesAllocatedPtr = otherAllocator.m_bytesAllocatedPtr;}
        // m_bytesAllocatedPtr{otherAllocator.m_bytesAllocatedPtr} {}

    template <typename R>
    CountingAllocator(CountingAllocator<R>&& otherAllocator) :
        BaseClass{} {m_bytesAllocatedPtr = std::move(otherAllocator.m_bytesAllocatedPtr);}
        // m_bytesAllocatedPtr{std::move(otherAllocator.m_bytesAllocatedPtr)} {}    

    size_t getAllocatedBytes() const {
        // std::cout << "Bytes allocated ptr: " << m_bytesAllocatedPtr << "\n";
        return m_bytesAllocatedPtr != nullptr ? *m_bytesAllocatedPtr : 0;
    }    

    T* allocate(size_t n) {
        *m_bytesAllocatedPtr += n * sizeof(T);
        return BaseClass::allocate(n);
    }

    void deallocate(T* p, size_t n) {
        *m_bytesAllocatedPtr -= n * sizeof(T);
        BaseClass::deallocate(p, n);
    }

    // Should be private but I can't be bothered with compilation errors.
    std::shared_ptr<size_t> m_bytesAllocatedPtr = std::make_shared<size_t>(0);

    using propagate_on_container_copy_assignment = std::true_type;
    using propagate_on_container_move_assignment = std::true_type;
    using propagate_on_container_swap = std::true_type;

    template <class R> struct rebind {using other = CountingAllocator<R>;};
};

}

#endif 