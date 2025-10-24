#ifndef UTILS__ARITHMETIC_OPS_FOR_PAIR_OVERLOADS_H
#define UTILS__ARITHMETIC_OPS_FOR_PAIR_OVERLOADS_H

#include <tuple>
#include <cmath>

namespace std {

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, std::pair<T, R>>
operator+(const std::pair<T, R>& tr1, const std::pair<T, R>& tr2) {
    return std::make_pair<T, R>(tr1.first + tr2.first, tr1.second + tr2.second);
}

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, std::pair<T, R>&>
operator+=(std::pair<T, R>& tr1, const std::pair<T, R>& tr2) {
    tr1.first += tr2.first;
    tr1.second += tr2.second;
    return tr1;
}

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, std::pair<T, R>>
operator-(const std::pair<T, R>& tr1, const std::pair<T, R>& tr2) {
    return std::make_pair<T, R>(tr1.first - tr2.first, tr1.second - tr2.second);
}

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, std::pair<T, R>&>
operator-=(std::pair<T, R>& tr1, const std::pair<T, R>& tr2) {
    tr1.first -= tr2.first;
    tr1.second -= tr2.second;
    return tr1;
}

template <typename T, typename R, typename C>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R> && std::is_arithmetic_v<C>, std::pair<T, R>>
operator*(const std::pair<T, R>& tr, const C& c) {
    return {tr.first * c, tr.second * c};
} 

template <typename T, typename R, typename C>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R> && std::is_arithmetic_v<C>, std::pair<T, R>>
operator*(const C& c, const std::pair<T, R>& tr) {
    return {c * tr.first, c * tr.second};
} 

template <typename T, typename R, typename C>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R> && std::is_arithmetic_v<C>, std::pair<T, R>&>
operator*=(std::pair<T, R>& tr, const C& c) {
    tr.first *= c;
    tr.second *= c;
    return tr;
}

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, double>
abs(const std::pair<T, R>& tr) {
    return std::sqrt(std::pow(std::abs(tr.first), 2) + std::pow(std::abs(tr.second), 2));
}

}

#endif