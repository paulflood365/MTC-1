CREATE VIEW [mtc_admin].vewCheckWindowWithStatus
AS SELECT cw.urlSlug, cw.name, CAST(
    CASE
        WHEN GETUTCDATE() < cw.adminStartDate THEN 'Inactive'
        WHEN GETUTCDATE() >= cw.adminStartDate AND GETUTCDATE() <= cw.adminEndDate THEN 'Active'
        ELSE 'Past'
    END AS NVARCHAR(50)
   ) AS [status]
FROM mtc.mtc_admin.checkWindow cw
