# -*- coding: utf-8 -*-
"""Remove the two leftover getSessionId imports; verify no other references remain."""
import io, sys

def patch(path, edits):
    with io.open(path, 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    for i, (old, new) in enumerate(edits):
        o, n = old.replace('\n', '\r\n'), new.replace('\n', '\r\n')
        cnt = content.count(o)
        if cnt != 1:
            print(f'FAIL {path} edit#{i}: found {cnt} matches')
            sys.exit(1)
        content = content.replace(o, n)
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print(f'OK   {path} ({len(edits)} edits)')

patch('frontend/src/components/cashier/RentBillForm.tsx', [(
"import { getSessionId } from '../../utils/session';\n",
"")])

patch('frontend/src/pages/CreditAccountForm.tsx', [(
"import { getSessionId } from '../utils/session';\n",
"")])

# verify zero remaining references anywhere
import glob
leftover = []
for p in glob.glob('frontend/src/**/*.ts*', recursive=True):
    with io.open(p, 'r', encoding='utf-8', newline='', errors='ignore') as f:
        if 'getSessionId' in f.read() or 'utils/session' in f.read():
            leftover.append(p)
if leftover:
    print('FAIL still referenced by:', leftover)
    sys.exit(1)
print('clean: no getSessionId / utils/session references remain')
