-- Separate transaction: enum values must commit before use.
alter type public.file_kind add value if not exists 'resource';
