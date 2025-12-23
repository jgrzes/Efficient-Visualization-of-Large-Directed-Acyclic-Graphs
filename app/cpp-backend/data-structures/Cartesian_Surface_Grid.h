#ifndef DATA_STRUCTURES__CARTESIAN_SURFACE_GRID_H
#define DATA_STRUCTURES__CARTESIAN_SURFACE_GRID_H

#include <unordered_set>
#include <cmath>

#include "Sparse_Matrix.h"
#include "../utils/traits.h"
#include "../utils/arithmetic_ops_for_pair_overloads.h"

namespace data_structures {

// static_assert(std::is_same_v<int, std::remove_pointer<int*>>);
// static_assert(std::is_same_v<int&, utils::decayed_from_ref_wrapper_to_lvalue_t<int>>);

template <typename T, typename LocationContainer, typename LocationContainerIndex>
class CartesianSurfaceGrid {

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
            LocationContainerIndex, std::pair<double, double>&
        >
    );

public:

    CartesianSurfaceGrid(
        const std::pair<double, double>& lowerLeft, const std::pair<double, double>& upperRight, 
        size_t rowCount, size_t columnCount, LocationContainer locationContainer
    ) : m_lowerLeft{lowerLeft}, m_upperRight{upperRight}, m_rowCount{rowCount}, m_columnCount{columnCount}, 
        m_epsilon{(upperRight.first - lowerLeft.first) / static_cast<double>(rowCount)}, 
        m_gamma{(upperRight.second - lowerLeft.second) / static_cast<double>(m_columnCount)}, 
        m_elementSetGrid{m_rowCount, m_columnCount}, m_locationContainer{locationContainer} {

        // std::cout << "Row and column counts: " << m_rowCount << ", " << m_columnCount << "\n";
        // std::cout << "Lower left: " <<  m_lowerLeft.first << ", " << m_lowerLeft.second << "\n";
        // std::cout << "Upper right: " <<  m_upperRight.first << ", " << m_upperRight.second << "\n";
    }

    void emplaceNewElement(const T& t, const std::pair<double, double>& tPosition) {
        auto&& [i, j] = getIAndJIndicesForPosition(tPosition);
        (m_elementSetGrid.at(i, j)).emplace(t);
        // Mark element location in the LocationContainer
        updateTPositionInLocationConatiner(t, tPosition);
    }    

    void moveElementToNewPosition(const T& t, const std::pair<double, double>& tNewPosition) {
        // auto&& [iCurrent, jCurrent] = findCurrentPositionForElement(t);
        auto&& [iCurrent, jCurrent] = findCurrentGridCellForElement(t);
        auto [iNew, jNew] = getIAndJIndicesForPosition(tNewPosition);
        if (iNew != iCurrent || jNew != jCurrent) {
            (m_elementSetGrid.at(iCurrent, jCurrent)).erase(t);
            (m_elementSetGrid.at(iNew, jNew)).emplace(t);
        }
        // Mark element location in the LocationContainer
        updateTPositionInLocationConatiner(t, tNewPosition);
    }

    void moveElementByVector(const T& t, const std::pair<double, double> mVec) {
        moveElementToNewPosition(t, findCurrentPositionForElement(t) + mVec);
    }

    void removeElement(const T& t) {
        auto&& [i, j] = findCurrentPositionForElement(t);
        (m_elementSetGrid.at(i, j)).erase(t);
    }

    std::vector<T> getElementsAtMaxDisFromElement(const T& t, double radius) {
        auto tPosition = findCurrentPositionForElement(t);
        auto&& [leftI, lowerJ] = getIAndJIndicesForPosition(
            tPosition - std::pair<double, double>(radius, radius)
        );
        auto&& [rightI, upperJ] = getIAndJIndicesForPosition(
            tPosition + std::pair<double, double>(radius, radius)
        );
        
        std::vector<T> elementsAtMaxDisFromT;
        // double radiusSquared = std::pow(radius, 2);

        for (size_t i=leftI; i<=rightI; ++i) {
            for (size_t j=lowerJ; j<=upperJ; ++j) {
                // std::cout << i << " " <<  j << "\n";
                if (!m_elementSetGrid.hasDataAt(i, j)) continue;
                auto& gridIJ = m_elementSetGrid.at(i, j);
                for (uint32_t tPrim : gridIJ) {
                    auto tPrimPosition = findCurrentPositionForElement(tPrim);
                    double d = std::abs(tPosition - tPrimPosition);
                    if (d <= radius) elementsAtMaxDisFromT.emplace_back(tPrim);
                }
            }
        }
        return elementsAtMaxDisFromT;
    }

private:

    std::pair<size_t, size_t> getIAndJIndicesForPosition(const std::pair<double, double>& tPosition) {
        auto [xt, yt] = tPosition;
        // if (xt < m_lowerLeft.first || xt > m_upperRight.first 
        //     || yt < m_lowerLeft.second || yt > m_upperRight.second) {

        //     throw std::runtime_error{
        //         "Cartesian Surface Grid error: attempting to place at ("
        //         + std::to_string(xt) + ", " + std::to_string(yt)
        //         + "), which is outside the allowed area"
        //     };
        // }
        xt = std::min(std::max(xt, m_lowerLeft.first), m_upperRight.first);
        yt = std::min(std::max(yt, m_lowerLeft.second), m_upperRight.second);

        std::pair<size_t, size_t> cellIndices = {
            static_cast<size_t>(std::floor((xt - m_lowerLeft.first) / m_epsilon)), 
            static_cast<size_t>(std::floor((yt - m_lowerLeft.second) / m_gamma))
        };
        cellIndices.first = std::min(std::max(0UL, cellIndices.first), m_rowCount-1);
        cellIndices.second = std::min(std::max(0UL, cellIndices.second), m_columnCount-1);
        return cellIndices;
    }

    std::pair<double, double> findCurrentPositionForElement(const T& t) {
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

    std::pair<size_t, size_t> findCurrentGridCellForElement(const T& t) {
        return getIAndJIndicesForPosition(findCurrentPositionForElement(t));
    }

    void updateTPositionInLocationConatiner(const T& t, const std::pair<double, double>& tNewPosition) {
        if constexpr (std::is_pointer_v<LocationContainer>) {
            m_locationContainer->operator[]((LocationContainerIndex) t) = tNewPosition;
            return;
        } 
        if constexpr (utils::is_reference_wrapper_v<LocationContainer>) {
            m_locationContainer.get()[(LocationContainerIndex) t] = tNewPosition;
            return;
        }
        if constexpr (utils::is_lvalue_reference_v<LocationContainer>) {
            m_locationContainer[(LocationContainerIndex) t] = tNewPosition;
            return;
        }
    }

    const size_t m_rowCount;
    const size_t m_columnCount;
    SparseMatrix<std::unordered_set<T>, false> m_elementSetGrid;

    const std::pair<double, double> m_lowerLeft;
    const std::pair<double, double> m_upperRight;
    const double m_epsilon;
    const double m_gamma;

    LocationContainer m_locationContainer;
};

}

#endif