#!/bin/bash

cc_file=""
if [[ $# -eq 1 || $# -eq 2 ]]; then 
    first_arg=$1
    second_arg=$2
    if [[ ${first_arg} = "--help" || ${first_arg} = "-h" ]]; then 
        echo "Quick compile check script - quickly check if files compile without the need to recompile the whole project."
        echo "  --help -h"
        echo "      Displays help."
        echo " --file-combinations -fc FILE_PATH"
        echo "      Path to the file which contains the list of file combinations to check."
        exit
    elif [[ ( ${first_arg} = "--file-combinations" || ${first_arg} == "-fc" ) && $# -eq 2 ]]; then 
        cc_file=$2
        if [[ ! -f ${cc_file} ]]; then 
            echo "No such file exists!"
            exit
        fi
    else 
        echo "Invalid script arguments"
        exit    
    fi
else
    echo "Wrong number of arguments (use --help flag to see more)"
    exit    
fi

cxx="g++"
cxxflags="-Wall"

comp_output_file=$(mktemp)
trap `rm -f "${comp_output_file}"` EXIT

while IFS= read -r line; do
    line=$(echo ${line} | tr -s ' ')
    compilation_test_name=$(echo ${line} | tr ' ' '\n' | head -n 1)

    src_files_count=$(echo ${line} | tr ' ' '\n' | wc -l)
    src_files_count=$((${src_files_count}-2))
    src_files_list=$(echo ${line} | tr ' ' '\n' | tail -n ${src_files_count} | tr '\n' ' ')

    echo "Performing compilation for ${compilation_test_name}:"
    ${cxx} ${cxxflags} -o ${comp_output_file} ${src_files_list}
    succ=$?
    if [[ succ -eq 0 ]]; then 
        echo "Compilation for ${compilation_test_name} successful"
    else 
        echo "Compilation for ${compilation_test_name} failed"
    fi 
done < ${cc_file}