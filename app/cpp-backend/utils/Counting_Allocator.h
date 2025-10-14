#ifndef UTILS__COUNTING_ALLOCATOR_H
#define UTILS__COUNTINT_ALLOCATOR_H

#include <vector>
#include <memory>

namespace utils {

template <typename T>
class CountingAllocator : std::allocator<T> {

public:

    using BaseClass = std::allocator<T>;
    using std::allocator<T>::allocator;
    using std::allocator<T>::allocate;
    using std::allocator<T>::deallocate;
    using value_type = T;

    CountingAllocator() : BaseClass{}, m_bytesAllocatedPtr{std::make_shared<size_t>(0)} {}

    template <typename R>
    CountingAllocator(const CountingAllocator<R>& otherAllocator) :
        BaseClass{},
        // BaseClass{
        //     [&otherAllocator]() -> const CountingAllocator<R>& {
        //         using std::allocator<R>::allocator;
        //         return otherAllocator;
        //     }()
        // }, 
        m_bytesAllocatedPtr{otherAllocator.m_bytesAllocatedPtr} {}

    template <typename R>
    CountingAllocator(CountingAllocator<R>&& otherAllocator) :
        BaseClass{},
        // BaseClass{
        //     [&otherAllocator]() -> CountingAllocator<R>&& {
        //         using std::allocator<R>::allocator;
        //         return std::move(otherAllocator);
        //     }()
        // }, 
        m_bytesAllocatedPtr{std::move(otherAllocator.m_bytesAllocatedPtr)} {}    

    size_t getAllocatedBytes() const {return *m_bytesAllocatedPtr;}    

    T* allocate(size_t n) {
        *m_bytesAllocatedPtr += n * sizeof(T);
        return BaseClass::allocate(n);
    }

    void deallocate(T* p, size_t n) {
        *m_bytesAllocatedPtr -= n * sizeof(T);
        BaseClass::deallocate(p, n);
    }

    // Should be private but I can't be bothered with compilation errors.
    std::shared_ptr<size_t> m_bytesAllocatedPtr;

};

}

#endif 