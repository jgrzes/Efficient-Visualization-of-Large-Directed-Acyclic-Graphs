#ifndef UTILS__TRAITS_H
#define UTILS__TRAITS_H

#include <type_traits>
#include <iterator>

namespace utils {

template <typename T, typename = std::void_t<
    decltype(std::begin(std::declval<T&>())), 
    decltype(std::end(std::declval<T&>()))
>> struct is_iterable : std::true_type {};

template <typename T, typename = void>
struct is_iterable : std::false_type {};

template <typename T>
constexpr bool is_iterable_v = is_iterable<T>::value;

template <typename T, typename = std::void_t<
    typename std::enable_if<is_iterable_v<T>>::type, 
    typename std::enable_if<std::is_integral_v<typename T::value_type>>::type
>> struct is_iterable_and_stores_int_type : std::true_type {};

template <typename T, typename = void>
struct is_iterable_and_stores_int_type : std::false_type {};

template <typename T>
constexpr bool is_iterable_and_stores_int_type_v = is_iterable_and_stores_int_type<T>::value;

}

#endif