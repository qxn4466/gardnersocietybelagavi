# -*- coding: utf-8 -*-
"""TS fixes: optional chaining in DailyBalanceBar; IIFE narrowing in GeneralLedger."""
import io, sys

def T(s):
    return s.replace('\r\n', '\n').replace('\n', '\r\n')

def patch(path, edits):
    with io.open(path, 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    for i, (old, new) in enumerate(edits):
        o, n = T(old), T(new)
        cnt = content.count(o)
        if cnt != 1:
            print(f'FAIL {path} edit#{i}: found {cnt} matches')
            sys.exit(1)
        content = content.replace(o, n)
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print(f'OK   {path} ({len(edits)} edits)')

patch('frontend/src/components/DailyBalanceBar.tsx', [
(
'''    const confirmMsg = summary.records_empty
      ? (lang === 'mr'
''',
'''    const confirmMsg = summary?.records_empty
      ? (lang === 'mr'
'''),
(
'''        text: summary.records_empty
          ? (lang === 'mr' ? 'प्रारंभिक शिल्लक जतन केली! (नोंदी रिक्त असताना संपादन करता येईल.)' : 'Initial Opening Balance saved! (Editable while records are empty.)')
''',
'''        text: summary?.records_empty
          ? (lang === 'mr' ? 'प्रारंभिक शिल्लक जतन केली! (नोंदी रिक्त असताना संपादन करता येईल.)' : 'Initial Opening Balance saved! (Editable while records are empty.)')
'''),
])

patch('frontend/src/pages/GeneralLedger.tsx', [
(
'''                        {/* Expanded: individual entries with Bill/Voucher numbers */}
                        {isOpen && (entries[`${grp.account}|${year}`] === 'loading' ? (
''',
'''                        {/* Expanded: individual entries with Bill/Voucher numbers */}
                        {isOpen && (() => {
                          const list = entries[`${grp.account}|${year}`];
                          return list === 'loading' ? (
'''),
(
'''                          ) : (
                            (entries[`${grp.account}|${year}`] || []).map((e, ei) => (
''',
'''                          ) : (
                            (list || []).map((e: LedgerEntry, ei: number) => (
'''),
(
'''                              <td style={{ textAlign: 'right', fontFamily: 'monospace', color: e.nature === 'DEBIT' ? '#b91c1c' : '#15803d' }}>
                                {e.nature === 'DEBIT' ? '-' : '+'}{fmtPos(e.amount)}
                              </td>
                            </tr>
                          ))
                        ))}
''',
'''                              <td style={{ textAlign: 'right', fontFamily: 'monospace', color: e.nature === 'DEBIT' ? '#b91c1c' : '#15803d' }}>
                                {e.nature === 'DEBIT' ? '-' : '+'}{fmtPos(e.amount)}
                              </td>
                            </tr>
                          ))
                          );
                        })()}
'''),
])

print('TS FIXES APPLIED')
