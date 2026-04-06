import re
import sys

def extract_class(text, class_pattern):
    """Extract a class definition by matching braces from the start pattern."""
    match = re.search(class_pattern, text)
    if not match:
        return None, -1, -1
    
    start = match.start()
    # Find the opening brace of the class body
    brace_start = text.index('{', match.end() - 1)
    
    depth = 0
    i = brace_start
    in_string = False
    string_char = None
    escape_next = False
    
    while i < len(text):
        c = text[i]
        
        if escape_next:
            escape_next = False
            i += 1
            continue
            
        if c == '\\':
            escape_next = True
            i += 1
            continue
            
        if in_string:
            if c == string_char:
                in_string = False
            i += 1
            continue
            
        if c in ('"', "'", '`'):
            in_string = True
            string_char = c
            i += 1
            continue
            
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[start:i+1], start, i+1
        
        i += 1
    
    return None, start, -1

def extract_function(text, func_pattern):
    """Extract a function definition (arrow or regular) by matching braces."""
    match = re.search(func_pattern, text)
    if not match:
        return None, -1, -1
    
    start = match.start()
    # Look for the opening brace
    search_from = match.end()
    brace_pos = text.find('{', search_from - 5)
    if brace_pos == -1 or brace_pos > search_from + 50:
        # Maybe it's an arrow function without braces, look for =>
        arrow = text.find('=>', match.end())
        if arrow != -1 and arrow < match.end() + 20:
            brace_pos = text.find('{', arrow)
    
    if brace_pos == -1:
        return text[start:start+500], start, start+500
    
    depth = 0
    i = brace_pos
    in_string = False
    string_char = None
    escape_next = False
    
    while i < len(text):
        c = text[i]
        
        if escape_next:
            escape_next = False
            i += 1
            continue
            
        if c == '\\':
            escape_next = True
            i += 1
            continue
            
        if in_string:
            if c == string_char:
                in_string = False
            i += 1
            continue
            
        if c in ('"', "'", '`'):
            in_string = True
            string_char = c
            i += 1
            continue
            
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[start:i+1], start, i+1
        
        i += 1
    
    return None, start, -1

# Read the file
with open('/home/gem/home/tmp/amp-reverse/amp-js-bundles.txt', 'r') as f:
    text = f.read()

print(f"File size: {len(text)} chars")

# Define extraction targets
targets = [
    ("01_activity_group_widget_G1R.js", r'G1R=class G1R extends FT\{', 'class'),
    ("01_activity_group_state_z1R.js", r'z1R=class z1R extends KT\{', 'class'),
    ("02_confirmation_widget_TTT.js", r'TTT=class TTT extends FT\{', 'class'),
    ("02_confirmation_state_aTT.js", r'aTT=class aTT extends KT\{', 'class'),
    ("03_skills_modal_m9T.js", r'm9T=class m9T extends FT\{', 'class'),
    ("03_skills_modal_state_f9T.js", r'f9T=class f9T extends KT\{', 'class'),
    ("04_shortcut_help_v9T.js", r'v9T=class v9T extends z0\{', 'class'),
    ("06_horizontal_line_j9T.js", r'j9T=class j9T extends KT\{', 'class'),
    ("10_confirmation_dialog_eTT.js", r'eTT=class eTT extends z0\{', 'class'),
]

outdir = '/home/gem/workspace/flitter/tmux-capture/amp-source/'

for filename, pattern, kind in targets:
    if kind == 'class':
        result, start, end = extract_class(text, pattern)
    else:
        result, start, end = extract_function(text, pattern)
    
    if result:
        with open(outdir + filename, 'w') as f:
            f.write(result)
        print(f"OK: {filename} - {len(result)} chars (pos {start}-{end})")
    else:
        print(f"FAIL: {filename} - pattern: {pattern}")

