#ifndef DATA_STRUCTURES__BUCKETIFIED_LINE_SEGMENT_H
#define DATA_STRUCTURES__BUCKETIFIED_LINE_SEGMENT_H

#include <unordered_set>

#include "Sparse_Array.hpp"
#include "../utils/traits.h"

namespace data_structures {

using size_t = std::size_t;

template <typename T, typename LocationContainer, typename LocationContainerIndex>
class BucketifiedLineSegment {

    static_assert(
        utils::is_first_type_convertible_to_second_v<T, LocationContainerIndex>
        && utils::supports_element_finding_v<
            utils::extract_referenced_type_t<std::remove_pointer_t<LocationContainer>>, 
            LocationContainerIndex
        >
        && utils::supports_square_bracket_assignment_v<
            utils::extract_referenced_type_t<std::remove_pointer_t<LocationContainer>>, 
            LocationContainerIndex
        >
        && utils::does_square_bracket_assignment_return_A_v<
            utils::extract_referenced_type_t<std::remove_pointer_t<LocationContainer>>,
            LocationContainerIndex, double&
        >
    );

public:

    BucketifiedLineSegment(double low, double high, size_t bucketCount, LocationContainer locationContainer) :
        m_low{low}, m_high{high}, m_bucketCount{bucketCount}, 
        m_bucketWidth{(high-low) / m_bucketCount}, 
        m_buckets{bucketCount, std::unordered_set<T>()}, m_locationContainer{locationContainer} {}

    void emplaceNewElement(const T& t, double tPosition) {
        size_t bucketForT = findBucketIndexForPosition(tPosition);
        m_buckets[bucketForT].emplace(t);
        updateTPositionInLocationContainer(t, tPosition);
    }    

    void moveElementToNewPosition(const T& t, double tNewPosition) {
        size_t currentBucketForT = findCurrentBucketForElement(t);
        size_t newBucketForT = findBucketIndexForPosition(tNewPosition);
        if (currentBucketForT != newBucketForT) {
            m_buckets[currentBucketForT].erase(t);
            m_buckets[newBucketForT].emplace(t);
        }
        updateTPositionInLocationContainer(t, tNewPosition);
    }

    void moveElementByDistance(const T& t, double mDistance) {
        moveElementToNewPosition(t, findCurrentPositionForElement(t) + mDistance);
    }

    void removeElement(const T& t) {
        size_t bucketForT = findBucketIndexForPosition(t);
        m_buckets[bucketForT].erase(t);
    }

    std::vector<T> getElementsBetween(double intervalBegin, double intervalEnd) const {
        size_t intervalBeginBucketIndex = findBucketIndexForPosition(intervalBegin);
        size_t intervalEndBucketIndex = findBucketIndexForPosition(intervalEnd);
        std::vector<T> elementsInInterval;

        auto& beginBucketSet = m_buckets[intervalBeginBucketIndex];
        for (const T& t : beginBucketSet) {
            if (findCurrentPositionForElement(t) >= intervalBegin) {
                elementsInInterval.emplace_back(t);
            }
        }

        for (size_t i=intervalBeginBucketIndex+1; i<intervalEndBucketIndex; ++i) {
            auto& bucketSetI = m_buckets[i];
            for (const T& t : bucketSetI) {
                elementsInInterval.emplace_back(t);
            }
        }

        if (intervalBeginBucketIndex == intervalEndBucketIndex) {
            return elementsInInterval;
        }

        auto& endBucketSet = m_buckets[intervalEndBucketIndex];
        for (const T& t : endBucketSet) {
            if (findCurrentPositionForElement(t) <= intervalEnd) {
                elementsInInterval.emplace_back(t);
            }
        }

        return elementsInInterval;
    }

private:

    size_t findBucketIndexForPosition(double tPosition) const {
        if (tPosition <= m_low) return 0;
        else if (tPosition >= m_high) return m_bucketCount-1;
        size_t bucketIndex = static_cast<size_t>(std::floor(tPosition / m_bucketWidth));
        return std::max(static_cast<size_t>(0), std::min(m_bucketCount-1, bucketIndex));
    }

    double findCurrentPositionForElement(const T& t) const {
        if constexpr (std::is_pointer_v<LocationContainer>) {
            return m_locationContainer->operator[]((LocationContainerIndex) t);
        }
        if constexpr (utils::is_reference_wrapper_v<LocationContainer>) {
            return m_locationContainer.get()[(LocationContainerIndex) t];
        }
        if constexpr (utils::is_lvalue_reference_v<LocationContainer>) {
            return m_locationContainer[(LocationContainerIndex) t];
        }
    }

    size_t findCurrentBucketForElement(const T& t) const {
        return findBucketIndexForPosition(findCurrentPositionForElement(t));  
    }

    void updateTPositionInLocationContainer(const T& t, double tNewPosition) {
        if constexpr (std::is_pointer_v<LocationContainer>) {
            (m_locationContainer->operator[]((LocationContainerIndex) t)) = tNewPosition;
        }
        if constexpr (utils::is_reference_wrapper_v<LocationContainer>) {
            (m_locationContainer.get()[(LocationContainerIndex) t]) = tNewPosition;
        }
        if constexpr (utils::is_lvalue_reference_v<LocationContainerIndex>) {
            m_locationContainer[(LocationContainerIndex) t] = tNewPosition; 
        }
    }

    const double m_low;
    const double m_high;
    const size_t m_bucketCount;
    const double m_bucketWidth;

    SparseArray<std::unordered_set<T>> m_buckets;
    LocationContainer m_locationContainer;

};

}

#endif 