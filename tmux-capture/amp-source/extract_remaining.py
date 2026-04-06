import re
import sys

def extract_balanced(text, start_pos, open_char='{', close_char='}'):
    """Extract balanced text starting from start_pos."""
    brace_pos = text.find(open_char, start_pos)
    if brace_pos == -1:
        return None, -1
    
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
        if c == open_char:
            depth += 1
        elif c == close_char:
            depth -= 1
            if depth == 0:
                return text[start_pos:i+1], i+1
        i += 1
    
    return None, -1

def extract_array(text, start_pos):
    """Extract balanced array starting from start_pos."""
    bracket_pos = text.find('[', start_pos)
    if bracket_pos == -1:
        return None, -1
    
    depth = 0
    i = bracket_pos
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
        if c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                return text[start_pos:i+1], i+1
        i += 1
    
    return None, -1

# Read both files
with open('/home/gem/home/tmp/amp-reverse/amp-strings-long.txt', 'r') as f:
    long_text = f.read()
with open('/home/gem/home/tmp/amp-reverse/amp-js-bundles.txt', 'r') as f:
    bundles = f.read()

outdir = '/home/gem/workspace/flitter/tmux-capture/amp-source/'

# ==================== 6. InputArea widget ====================
# The InputArea is a complex widget. Let me find it by searching for distinctive UI features.
# It should contain: border decoration, "smart"/"skills", "of 300k" tokens text

# Search for the class that builds the input area with border decorations
# Key string: "of 300k" for token counting
for source_name, source in [("long", long_text), ("bundles", bundles)]:
    for m in re.finditer(r'of 300k', source):
        pos = m.start()
        # Get wide context
        ctx = source[max(0,pos-2000):pos+2000]
        # Find the enclosing class or function
        # Look for "=class" before this position
        class_matches = list(re.finditer(r'([a-zA-Z0-9_$]+)=class \1 extends (FT|KT|z0)', source[max(0,pos-10000):pos]))
        if class_matches:
            last_class = class_matches[-1]
            abs_pos = max(0,pos-10000) + last_class.start()
            result, end = extract_balanced(source, abs_pos)
            if result:
                with open(outdir + '06_input_area.js', 'w') as f:
                    f.write(f"// Enclosing class: {last_class.group(1)}\n")
                    f.write(result)
                print(f"InputArea ({source_name}): class {last_class.group(1)}, {len(result)} chars")
            break
    else:
        continue
    break

# ==================== 7. yB/zB0 footer status ====================
# Search for yB function
for source_name, source in [("long", long_text), ("bundles", bundles)]:
    # yB is likely a function that returns status text
    for m in re.finditer(r'(?<![a-zA-Z0-9_$])yB\s*[=(]', source):
        pos = m.start()
        ctx = source[pos:pos+500]
        print(f"yB ({source_name}) at {pos}: {ctx[:300]}")
        print()

# Search for zB0 function
for source_name, source in [("long", long_text), ("bundles", bundles)]:
    for m in re.finditer(r'(?<![a-zA-Z0-9_$])zB0\s*[=(]', source):
        pos = m.start()
        ctx = source[pos:pos+500]
        print(f"zB0 ({source_name}) at {pos}: {ctx[:300]}")
        print()

# ==================== 8. iO0 function ====================
# iO0 is the function with status messages
for source_name, source in [("long", long_text), ("bundles", bundles)]:
    m = re.search(r'(?<![a-zA-Z0-9_$])iO0\(R\)\{switch', source)
    if m:
        pos = m.start()
        result, end = extract_balanced(source, pos)
        if result:
            with open(outdir + '08_footer_status_iO0.js', 'w') as f:
                f.write(result)
            print(f"iO0 ({source_name}): {len(result)} chars")
        break

# ==================== 9. Welcome screen ====================
# Search for "Welcome to Amp" or "density orb"
for source_name, source in [("long", long_text), ("bundles", bundles)]:
    for m in re.finditer(r'Welcome to Amp', source):
        pos = m.start()
        ctx = source[max(0,pos-2000):pos+2000]
        # Find enclosing class
        class_matches = list(re.finditer(r'([a-zA-Z0-9_$]+)=class \1 extends (FT|KT|z0)', source[max(0,pos-15000):pos]))
        if class_matches:
            last_class = class_matches[-1]
            abs_pos = max(0,pos-15000) + last_class.start()
            result, end = extract_balanced(source, abs_pos)
            if result and 'Welcome to Amp' in result:
                with open(outdir + '09_welcome_screen.js', 'w') as f:
                    f.write(f"// Enclosing class: {last_class.group(1)}\n")
                    f.write(result)
                print(f"Welcome screen ({source_name}): class {last_class.group(1)}, {len(result)} chars")
                break
        # Also try searching for a function containing it
        func_matches = list(re.finditer(r'([a-zA-Z0-9_$]+)\s*[=(]\s*(?:function|\()', source[max(0,pos-5000):pos]))
        if func_matches:
            last_func = func_matches[-1]
            abs_pos = max(0,pos-5000) + last_func.start()
            ctx2 = source[abs_pos:abs_pos+200]
            print(f"  Nearby function ({source_name}): {ctx2[:150]}")
    
    # Also search for density orb
    for m in re.finditer(r'density.{0,5}orb', source, re.IGNORECASE):
        pos = m.start()
        ctx = source[max(0,pos-100):pos+100]
        print(f"Density orb ({source_name}) at {pos}: {ctx[:200]}")

# ==================== 11. C_R shortcuts data ====================
for source_name, source in [("long", long_text), ("bundles", bundles)]:
    m = re.search(r'(?<![a-zA-Z0-9_$])C_R\s*=\s*\[', source)
    if m:
        pos = m.start()
        result, end = extract_array(source, pos)
        if result:
            with open(outdir + '11_shortcuts_data_C_R.js', 'w') as f:
                f.write(result)
            print(f"C_R shortcuts ({source_name}): {len(result)} chars")
        break

