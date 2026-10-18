# Выпуск компьютерного клуба на основной сайт

Пользователь разрешил перенос после общей проверки: «проверил, все работает, давай аккуратно переносить на боевой сайт».

- Принятый тестовый источник: de8abd95dce88bf7540d78f4f93507aed14903bd; 18 согласованных игр. NFSU принят на 132f2bca6ddb5f0cc412597ac4d7eff6de9e4d4f. Alt+Enter и F приняты на dddc83a441df7b02af06b329391ad68e0c99bbf9.
- Переносится только PC functionality и frozen runtime dependencies. Пакеты, профили, отдельные MP2/Stronghold workers и input/fullscreen не пересобираются и не перенастраиваются.
- Медиа читаются с https://media.art-ai.studio/pc/releases/; production R2 добавляется immutable-copy без overwrite/delete. Список 32 объектов и SHA-256 verification хранятся в private release audit.
- Сохранения не читаются, не очищаются и не мигрируют с тестового origin. Namespaces/gameIds сохранены; на production это независимые данные браузера.
- Не переносится тестовая плашка, глобальный noindex, staging build hook, staging middleware или staging SEO. PC остаётся noindex и cross-origin isolated; остальные разделы не получают COEP.
- Существующий исходный checkout и тестовая ветка не меняются. Отдельный production-release checkout, preview pc-club-release, затем fast-forward main после проверок.
- Rollback: сохранённый production deployment e0748c61-4a6e-4459-bbe6-91abf4a18ebf / main 24a5ddace6c58fd9ae63c3884dbece2255d3df23, либо git revert release commit. Immutable R2 objects при откате не нужно удалять. Не использовать reset/force push.
- Проверки: 93 production scoped tests, lint 0 errors/14 прежних warnings, build. Non-PC rebuilt baseline сравнивается побитово; actual preview/production delivery подтверждается отдельным release audit. Scoped tests не объявляются полным engine gate или новым прохождением всех игр. Прежние локальные ограничения движка сохранены.
