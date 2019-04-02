DROP INDEX [mtc_admin].pupil.pupil_upn_uindex;
CREATE UNIQUE NONCLUSTERED INDEX [pupil_upn_school_id_uindex] ON [mtc_admin].[pupil]
(
  [upn], [school_id]
)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)