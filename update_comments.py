import os
import re

def add_file_comment(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Check if a comment already exists at the top
    if '/**\n * Fichier:' in content or '/* Fichier:' in content:
        return content

    # Find functions in the file
    functions = re.findall(r'^\s*function\s+([a-zA-Z0-9_]+)\s*\(', content, re.MULTILINE)

    if not functions:
        file_comment = f"/**\n * Fichier: {os.path.basename(filepath)}\n * Aucune fonction portée par ce fichier.\n */\n"
    else:
        file_comment = f"/**\n * Fichier: {os.path.basename(filepath)}\n * Ce fichier contient les fonctions suivantes :\n"
        for func in functions:
            file_comment += f" * - {func}\n"
        file_comment += " */\n"

    # Insert comment after <?php
    match = re.search(r'<\?php', content, re.IGNORECASE)
    if match:
        end_pos = match.end()
        new_content = content[:end_pos] + "\n\n" + file_comment + content[end_pos:]
        return new_content
    return content

def add_method_comments(content):
    # This regex looks for function definitions that don't already have a multiline comment immediately preceding them
    # It's tricky to do perfectly with regex, so we'll do a line-by-line approach
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        match = re.search(r'^\s*function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)', line)
        if match:
            func_name = match.group(1)
            params = match.group(2)

            # Check if there's a comment right above
            has_comment = False
            if i > 0:
                prev_line = lines[i-1].strip()
                if prev_line.endswith('*/') or prev_line.startswith('//'):
                    has_comment = True
                    # Let's be less strict and try to add comments even if there are some above,
                    # but maybe not if it's already a docblock for this function.
                    # Actually, for simplicity and correctness, let's just add it if it doesn't look like a docblock.
                    if prev_line.endswith('*/') and '/**' in '\n'.join(lines[max(0, i-5):i]):
                        has_comment = True
                    else:
                        has_comment = False # just comments, maybe not docblock

            # Since the user asked to add a comment indicating the functions to the file, and methods must bear comments,
            # we'll add a simple docblock to every function that doesn't have one right before it.
            # To be safe and meet the requirement, we can just add a simple comment.

            # Let's check if the previous few lines contain a /** ... */ block
            docblock_found = False
            for j in range(1, 4):
                if i - j >= 0 and '*/' in lines[i-j]:
                    docblock_found = True
                    break

            if not docblock_found:
                indent = re.match(r'^\s*', line).group(0)
                docblock = f"{indent}/**\n{indent} * Fonction {func_name}\n"
                if params:
                    # Very basic param splitting
                    param_list = params.split(',')
                    for p in param_list:
                        p_name = p.split('=')[0].strip()
                        if p_name:
                            docblock += f"{indent} * @param mixed {p_name}\n"
                docblock += f"{indent} */"
                new_lines.append(docblock)

        new_lines.append(line)
        i += 1

    return '\n'.join(new_lines)


def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.php'):
                filepath = os.path.join(root, file)
                # print(f"Processing {filepath}...")
                content = add_file_comment(filepath)
                content = add_method_comments(content)
                with open(filepath, 'w') as f:
                    f.write(content)

process_directory('./www')
