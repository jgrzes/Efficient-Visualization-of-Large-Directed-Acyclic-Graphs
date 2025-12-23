#ifndef DATA_STRUCTURES__ONE_PAIR_FIELD_ARRAY_WRAPPER_H
#define DATA_STRUCTURES__ONE_PAIR_FIELD_ARRAY_WRAPPER_H

#include <cstdint>
#include <utility>

#include "../utils/traits.h"

namespace data_structures {

template <typename T, typename R, typename S, uint8_t PairIndex = 1>
class OnePairFieldArrayWrapper {

    static_assert(
        ((PairIndex == 1 && std::is_same_v<T, R>) || (PairIndex == 2 && std::is_same_v<T, S>))
        // && utils::supports_element_finding_v<
        //     utils::extract_referenced_type_t<std::remove_pointer_t<LocationContainer>>, size_t
        // >
        // && utils::supports_square_bracket_assignment_v<
        //     utils::extract_referenced_type_t<std::remove_pointer_t<LocationContainer>>, size_t 
        // >
        // && utils::does_square_bracket_assignment_return_A_v<
        //     utils::extract_referenced_type_t<std::remove_pointer_t<LocationContainer>>, 
        //     size_t, std::pair<R, S>&
        // >
    );

public:

    class Iterator : public std::vector<std::pair<R, S>>::iterator {

        using BaseClass = typename std::vector<std::pair<R, S>>::iterator;

        Iterator() = delete;
        Iterator(const BaseClass& otherBaseClass) : BaseClass{otherBaseClass} {}
        Iterator(BaseClass&& otherBaseClass) : BaseClass{std::move(otherBaseClass)} {}
        
        Iterator& operator=(const BaseClass& otherBaseClass) {
            if (this == &otherBaseClass) return *this;
            BaseClass::operator=(otherBaseClass);
            return *this;
        }

        Iterator& operator=(BaseClass&& otherBaseClass) {
            if (this == &otherBaseClass) return *this;
            BaseClass::operator=(std::move(otherBaseClass));
            return *this;
        }

        template <uint8_t PI = PairIndex, std::enable_if_t<PI == 1, uint8_t> = 0>
        const R& operator*() const {
            return const_cast<Iterator&>(*this).operator*();
        } 

        template <uint8_t PI = PairIndex, std::enable_if_t<PI == 1, uint8_t> = 0>
        R& operator*() {
            return BaseClass::operator*().first;
        }

        template <uint8_t PI = PairIndex, std::enable_if_t<PI == 2, uint8_t> = 0>
        const S& operator*() const {
            return const_cast<Iterator&>(*this).operator*();
        }

        template <uint8_t PI = PairIndex, std::enable_if_t<PI == 2, uint8_t> = 0>
        S& operator*() {
            return BaseClass::operator*().second;
        }

    };

    OnePairFieldArrayWrapper(std::vector<std::pair<R, S>>& wrappedPairArrayRef) :
        m_wrappedPairArrayRef{wrappedPairArrayRef} {}

    size_t size() const {return m_wrappedPairArrayRef.size();}
    
    const T& operator[](size_t i) const {
        return const_cast<const T&>(
            (const_cast<OnePairFieldArrayWrapper<T, R, S, PairIndex>&>(*this))[i]
        );
    }

    T& operator[](size_t i) {
        if constexpr (PairIndex == 1) {
            return static_cast<T&>(m_wrappedPairArrayRef[i].first);
        }
        if constexpr (PairIndex == 2) {
            return static_cast<T&>(m_wrappedPairArrayRef[i].second);
        }
    }

    Iterator begin() {return Iterator(m_wrappedPairArrayRef.begin());}

    Iterator end() {return Iterator(m_wrappedPairArrayRef.end());}

private:

    std::vector<std::pair<R, S>>& m_wrappedPairArrayRef;

};

}

#endif 