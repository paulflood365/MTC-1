ALTER TABLE [mtc_admin].pupilAccessArrangements DROP CONSTRAINT FK_pupilAccessArrangements_questionReaderReasons_id
ALTER TABLE [mtc_admin].pupilAccessArrangements DROP CONSTRAINT FK_pupilAccessArrangements_pupil_id
ALTER TABLE [mtc_admin].pupilAccessArrangements DROP CONSTRAINT FK_pupilAccessArrangements_recordedBy_user_id

DROP TABLE [mtc_admin].[pupilAccessArrangements]