#ifndef UTILS__TRAITS_H
#define UTILS__TRAITS_H

#include <type_traits>
#include <iterator>
#include <functional>
#include <string>

namespace utils {

template <typename T, typename = void>
struct is_iterable : std::false_type {};

template <typename T>
struct is_iterable<T, std::void_t<
    decltype(std::begin(std::declval<T&>())),
    decltype(std::end(std::declval<T&>()))
>> : std::true_type {};

template <typename T>
constexpr bool is_iterable_v = is_iterable<T>::value;

template <typename T, typename = void>
struct is_iterable_and_stores_int_type : std::false_type {};

template <typename T>
struct is_iterable_and_stores_int_type<T, std::void_t<
    typename std::enable_if<is_iterable_v<T>>::type, 
    typename std::enable_if<std::is_integral_v<typename T::value_type>>::type
>> : std::true_type {};

template <typename T>
constexpr bool is_iterable_and_stores_int_type_v = is_iterable_and_stores_int_type<T>::value;

template <typename T, typename I, typename = void>
struct supports_element_finding : std::false_type {};

template <typename T, typename I>
struct supports_element_finding<T, I, std::void_t<
    decltype(is_iterable_v<T>), 
    decltype(std::find(std::begin(std::declval<T&>()), std::end(std::declval<T&>()), std::declval<I&>()))
>> : std::true_type {};

template <typename T, typename I>
constexpr bool supports_element_finding_v = supports_element_finding<T, I>::value;

template <typename T, typename I, typename = void>
struct supports_square_bracket_assignment : std::false_type {};

template <typename T, typename I>
struct supports_square_bracket_assignment<T, I, std::void_t<
    decltype(std::declval<T&>()[std::declval<I&>()])
>> : std::true_type {};

template <typename T, typename I>
constexpr bool supports_square_bracket_assignment_v = supports_square_bracket_assignment<T, I>::value;

template <typename T, typename I, typename A, typename = void>
struct does_square_bracket_assignment_return_A : std::false_type {};

template <typename T, typename I, typename A>
struct does_square_bracket_assignment_return_A<T, I, A, std::void_t<
    decltype(supports_square_bracket_assignment_v<T, I>), 
    decltype(std::is_same_v<decltype(std::declval<T&>()[std::declval<I&>()]), A>)
>> : std::true_type {};

template <typename T, typename I, typename A>
constexpr bool does_square_bracket_assignment_return_A_v = does_square_bracket_assignment_return_A<T, I, A>::value;

template <typename T>
struct is_reference_wrapper : std::false_type {};

template <typename R>
struct is_reference_wrapper<std::reference_wrapper<R>> : std::true_type {};

template <typename T>
constexpr bool is_reference_wrapper_v = is_reference_wrapper<T>::value;

template <typename T>
struct is_lvalue_reference : std::false_type {};

template <typename R>
struct is_lvalue_reference<R&> : std::true_type {};

template <typename T>
constexpr bool is_lvalue_reference_v = is_lvalue_reference<T>::value;

template <typename T, typename R, typename = void>
struct is_first_type_convertible_to_second : std::false_type {};

template <typename T, typename R>
struct is_first_type_convertible_to_second<T, R, std::void_t<
    decltype((R) std::declval<T&>())
>> : std::true_type {};

template <typename T, typename R>
constexpr bool is_first_type_convertible_to_second_v = is_first_type_convertible_to_second<T, R>::value;

template <typename T>
struct extract_referenced_type {
    using type = T;
};

template <typename P>
struct extract_referenced_type<P&> {
    using type = P;
};

template <typename R>
struct extract_referenced_type<std::reference_wrapper<R>> {
    using type = R;
};

template <typename T>
using extract_referenced_type_t = typename extract_referenced_type<T>::type;

}

#endif