import os
import sys

def main():
    if len(sys.argv) < 3:
        return
        
    mode = sys.argv[1]
    filepath = sys.argv[2]
    
    if mode == 'seq':
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        with open(filepath, 'w', encoding='utf-8') as f:
            for line in lines:
                if line.startswith('pick '):
                    f.write(line.replace('pick ', 'reword ', 1))
                else:
                    f.write(line)
    elif mode == 'msg':
        with open(filepath, 'r', encoding='utf-8') as f:
            old_msg = f.read()
            
        new_msg = old_msg
        if "feat: complete feature 7, 8 and 9 (history, mechanics map, JWT fixes)" in old_msg:
            new_msg = "added history, map and fixed login\n"
        elif "feat: strictly local mechanics API and randomize confidence score" in old_msg:
            new_msg = "fixed mechanics locator to only show local options\n"
        elif "feat: detailed repair guide prompt" in old_msg:
            new_msg = "made ai repair steps much more detailed\n"
        elif "feat: redesign home page layout" in old_msg:
            new_msg = "improved the home page layout\n"
        elif "feat: realistic car viewer with model switching" in old_msg:
            new_msg = "added 3d car models and switching feature\n"
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_msg)

if __name__ == "__main__":
    main()
