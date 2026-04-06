import re
import sys

def extract_class_body(text, start_pos):
    """Extract a class body starting from a given position, using brace matching."""
    # Find the opening brace
    brace_pos = text.find('{', start_pos)
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
            
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[start_pos:i+1], i+1
        
        i += 1
    
    return None, -1

def extract_by_pattern(text, pattern, label):
    """Extract a named entity (class or function) by regex pattern."""
    match = re.search(pattern, text)
    if not match:
        return None
    
    result, end = extract_class_body(text, match.start())
    if result:
        return result
    else:
        # Fallback: return a large chunk
        return text[match.start():match.start()+5000] + "\n/* ... TRUNCATED ... */"

# Read the long strings file (which has the complete code)
with open('/home/gem/home/tmp/amp-reverse/amp-strings-long.txt', 'r') as f:
    text = f.read()

print(f"Long strings file size: {len(text)} chars")

# Also read the bundles file for stuff only there
with open('/home/gem/home/tmp/amp-reverse/amp-js-bundles.txt', 'r') as f:
    bundles = f.read()

print(f"Bundles file size: {len(bundles)} chars")

# Combine both for maximum coverage (deduplicated content doesn't matter for extraction)
combined = text + "\n\n/* === BUNDLES FILE === */\n\n" + bundles

outdir = '/home/gem/workspace/flitter/tmux-capture/amp-source/'

# ==================== EXTRACTION TARGETS ====================

targets = [
    # 1. ActivityGroupWidget
    ("01_activity_group_G1R.js", r'G1R=class G1R extends FT\{'),
    ("01_activity_group_state_z1R.js", r'z1R=class z1R extends KT\{'),
    
    # 2. ConfirmationWidget 
    ("02_confirmation_TTT.js", r'TTT=class TTT extends FT\{'),
    ("02_confirmation_state_aTT.js", r'aTT=class aTT extends KT\{'),
    
    # 3. SkillsModal
    ("03_skills_modal_m9T.js", r'm9T=class m9T extends FT\{'),
    ("03_skills_modal_state_f9T.js", r'f9T=class f9T extends KT\{'),
    
    # 4. ShortcutHelp
    ("04_shortcut_help_v9T.js", r'v9T=class v9T extends z0\{'),
    
    # 5. HorizontalLine widget
    ("05_horizontal_line_dollar9T.js", r'\$9T=class \$9T extends Ln\{'),
    ("05_horizontal_line_j9T.js", r'j9T=class j9T extends q9\{'),
    
    # 10. ConfirmationDialog inner layout
    ("10_confirmation_dialog_eTT.js", r'eTT=class eTT extends FT\{'),
]

for filename, pattern in targets:
    result = extract_by_pattern(combined, pattern, filename)
    if result:
        with open(outdir + filename, 'w') as f:
            f.write(result)
        print(f"OK: {filename} - {len(result)} chars")
    else:
        print(f"FAIL: {filename} - pattern not found")

print("\n=== Now extracting non-class targets ===\n")

# ==================== FUNCTION / DATA EXTRACTIONS ====================

# 6. InputArea widget - search for the widget that contains smart/skills/border text
# Let me find it by its distinctive features
for name_pat in [r'of 300k', r'smart\b.*skills', r'\u251C\u2500\u2500']:
    matches = list(re.finditer(name_pat, combined))
    if matches:
        m = matches[0]
        print(f"Pattern '{name_pat}' found at pos {m.start()}")
        # Show context
        ctx = combined[max(0,m.start()-200):m.start()+200]
        print(f"  ...{ctx[:300]}...")
        print()

# 7. yB/zB0 functions - footer status
for name_pat in [r'(?<![a-zA-Z0-9_$])yB\s*=', r'(?<![a-zA-Z0-9_$])zB0\s*=']:
    matches = list(re.finditer(name_pat, combined))
    if matches:
        for m in matches:
            ctx = combined[m.start():m.start()+200]
            print(f"Pattern '{name_pat}' at pos {m.start()}: {ctx[:200]}")
            print()

# 8. iO0 function
for m in re.finditer(r'(?<![a-zA-Z0-9_$])iO0\s*[=(]', combined):
    ctx = combined[m.start():m.start()+200]
    print(f"iO0 at pos {m.start()}: {ctx[:200]}")
    print()

# 11. C_R shortcuts data  
for m in re.finditer(r'(?<![a-zA-Z0-9_$])C_R\s*=', combined):
    ctx = combined[m.start():m.start()+300]
    print(f"C_R at pos {m.start()}: {ctx[:300]}")
    print()

