CREATE DATABASE course_platform;

\c course_platform

SET NAMES 'UTF8';

SET CLIENT_ENCODING TO 'UTF8';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR (255) NOT NULL UNIQUE,
  password VARCHAR (255) NOT NULL,
  is_admin BOOLEAN NOT NULL
);


CREATE TABLE course_chapter (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_path VARCHAR (255) NOT NULL,
  no INT UNIQUE NOT NULL,
  created_date TIMESTAMP NOT NULL DEFAULT NOW() 
);

CREATE TABLE test (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  course_chapter_id uuid NOT NULL REFERENCES course_chapter ON DELETE CASCADE,
  created_date TIMESTAMP NOT NULL DEFAULT NOW() 
);

CREATE TABLE test_question (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  test_id uuid NOT NULL REFERENCES test ON DELETE CASCADE,
  created_date TIMESTAMP NOT NULL DEFAULT NOW() 
);

CREATE TABLE test_answer (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  correct BOOLEAN NOT NULL,
  test_question_id uuid NOT NULL REFERENCES test_question ON DELETE CASCADE,
  created_date TIMESTAMP NOT NULL DEFAULT NOW() 
);


CREATE TABLE course_chapter_user (
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  course_chapter_id uuid NOT NULL REFERENCES course_chapter ON DELETE CASCADE,
  completed BOOLEAN NOT NULL,
  created_date TIMESTAMP NOT NULL DEFAULT NOW(),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  complete_date TIMESTAMP,
  PRIMARY KEY (user_id, course_chapter_id)
);

CREATE TABLE test_user (
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES test ON DELETE CASCADE,
  attempts INT NOT NULL DEFAULT 1,
  passed BOOLEAN NOT NULL DEFAULT 'f',
  created_date TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, test_id)
);



-- proper insertion of a test
WITH
  test_key AS (
    INSERT INTO
      test (title, course_chapter_id)
    VALUES ('another test of the chapter', '35fa3c9d-9abd-4e71-ac6e-f1da059f0214')
    RETURNING id
  ),
  question_key AS (
    INSERT INTO 
      test_question (title, test_id)
    VALUES
      ('another question of the test', (SELECT id FROM test_key))
    RETURNING id
  )
INSERT INTO
  test_answer (title, correct, test_question_id)
VALUES
  ('another answer 1', 'f', (SELECT id FROM question_key)),
  ('another answer 2', 'f', (SELECT id FROM question_key)),
  ('another answer 3', 't', (SELECT id FROM question_key)),
  ('another answer 4', 'f', (SELECT id FROM question_key))
RETURNING *
;



UPDATE course_chapter SET title = 'test course chapter', content = 'bla bla', image_path = '/img/test_course_chapter.png', no = 1
WHERE id = '';

-- proper update of a test with a transaction
BEGIN;
UPDATE test SET title = 'testing test'
WHERE id = '';

UPDATE test_question SET title = 'test question'
WHERE id = '';

UPDATE test_answer SET title = 'test answer', correct = 't'
WHERE id = '';
COMMIT;



UPDATE course_chapter_user SET completed = 't', complete_date = '2022-05-22 19:10:25-07'
WHERE user_id = '' AND course_chapter_id = '';


DELETE FROM test_answer
WHERE id = '';

DELETE FROM course_user
WHERE user_id = ''
AND course_id = '';

DELETE FROM course_part_user
WHERE user_id = ''
AND course_part_id = '';

DELETE FROM course_chapter_user
WHERE user_id = ''
AND course_chapter_id = '';

DELETE FROM passed_test
WHERE user_id = ''
AND test_id;


DELETE FROM course_chapter
WHERE id = '';

DELETE FROM test
WHERE id = '';

DELETE FROM test_question
WHERE id = '';

DELETE FROM test_answer
WHERE id = '';


-- data for a dashboard

SELECT
  (
    SELECT COUNT(*)
    FROM course_chapter
  ) AS "allChapterAmount",
  (
    SELECT COUNT(*)
    FROM course_chapter_user
    WHERE user_id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd' AND completed
  ) AS "completedChapterAmount",
  (
    SELECT COUNT(*)
    FROM test_user
    WHERE user_id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
  ) AS "enrolledTestAmount",
  (
    SELECT COUNT(*)
    FROM test_user
    WHERE user_id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd' AND passed
  ) AS "passedTestAmount"
FROM users AS u
CROSS JOIN course_chapter AS cch
JOIN course_chapter_user AS cchu
  ON cchu.user_id = u.id
JOIN test_user AS tu
  ON tu.user_id = u.id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd' LIMIT 1;


-- кесте
-- студенттің өткен курс тарауларының тізімі 
SELECT
  cchu.start_date AS "started",
  cchu.complete_date AS "completed"
FROM users AS u
JOIN course_chapter_user AS cchu ON cchu.user_id = u.id
WHERE cchu.completed;

SELECT
  cchu.start_date AS "started",
  cchu.complete_date AS "completed",
  COUNT(tu.test_id) AS "enrolledTests",
  COUNT(tu.passed) AS "passedTests"
FROM users AS u
JOIN course_chapter_user AS cchu ON cchu.user_id = u.id
WHERE cchu.completed;
 
-- data for a course chapters page
SELECT
  cch.no AS "#", 
  cch.title AS "title",
  cch.description AS "description",
  cchu.completed AS "completed"
FROM users AS u
JOIN course_chapter_user AS cchu ON cchu.user_id = u.id
FULL JOIN course_chapter AS cch ON cch.id = cchu.course_chapter_id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
UNION ALL SELECT
  cchf.no,
  cchf.title,
  cchf.description,
  null
FROM course_chapter AS cchf
WHERE cchf.no > (
  SELECT COUNT(*)
  FROM users AS u1
  JOIN course_chapter_user AS cchu1
  ON cchu1.user_id = u1.id
  JOIN course_chapter AS cch1 ON cch1.id = cchu1.course_chapter_id
  WHERE u1.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
);

SELECT
  cch.no AS "#", 
  cch.title AS "title",
  cch.description AS "description",
  cchu.completed AS "completed"
FROM users AS u
JOIN course_chapter_user AS cchu ON cchu.user_id = u.id
FULL JOIN course_chapter AS cch ON cch.id = cchu.course_chapter_id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
UNION ALL SELECT
  cchf.no,
  cchf.title,
  cchf.description,
  null
FROM course_chapter AS cchf
WHERE cchf.no > (
  SELECT COUNT(*)
  FROM users AS u1
  JOIN course_chapter_user AS cchu1
  ON cchu1.user_id = u1.id
  JOIN course_chapter AS cch1 ON cch1.id = cchu1.course_chapter_id
  WHERE u1.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
);

-- data for a course chapter page
SELECT 
  title AS "title",
  description AS "description",
  content AS "content",
  image_path AS "image",
  CASE WHEN EXISTS(
    SELECT *
    FROM test AS t
    INNER JOIN course_chapter AS cch2
      ON cch2.id = t.course_chapter_id
    WHERE cch2.id = '6221e544-45a5-4fe8-8347-c10729a77248'
  ) THEN 't' ELSE 'f' END AS "has_test"
FROM course_chapter 
WHERE id = '6221e544-45a5-4fe8-8347-c10729a77248';


SELECT 
  cch.title AS "title",
  cch.description AS "description",
  cch.content AS "content",
  cch.image_path AS "image",
  cchu.completed AS "completed"
FROM users AS u
JOIN course_chapter_user AS cchu ON cchu.user_id = u.id
JOIN course_chapter AS cch ON cch.id = cchu.course_chapter_id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
  AND cchu.course_chapter_id = '237d6180-5c57-4c5d-af09-9062fc3de9f7'
UNION ALL
SELECT 
  title AS "title",
  description AS "description",
  content AS "content",
  image_path AS "image",
  'f' AS "completed"
FROM course_chapter 
WHERE id = '237d6180-5c57-4c5d-af09-9062fc3de9f7' AND NOT EXISTS(

SELECT 
  cch1.title AS "title",
  cch1.description AS "description",
  cch1.content AS "content",
  cch1.image_path AS "image",
  cchu1.completed AS "completed"
FROM users AS u1
JOIN course_chapter_user AS cchu1 ON cchu1.user_id = u1.id
JOIN course_chapter AS cch1 ON cch1.id = cchu1.course_chapter_id
WHERE u1.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
  AND cchu1.course_chapter_id = '237d6180-5c57-4c5d-af09-9062fc3de9f7'

);

-- tests added
SELECT 
  cch.title AS "title",
  cch.description AS "description",
  cch.content AS "content",
  cch.image_path AS "image",
  cchu.completed AS "completed",
  CASE WHEN EXISTS(
    SELECT *
    FROM test AS t
    INNER JOIN course_chapter AS cch2
      ON cch2.id = t.course_chapter_id
    WHERE cch2.id = '6221e544-45a5-4fe8-8347-c10729a77248'
  ) THEN 't' ELSE 'f' END AS "has_test"
FROM users AS u
JOIN course_chapter_user AS cchu ON cchu.user_id = u.id
JOIN course_chapter AS cch ON cch.id = cchu.course_chapter_id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
  AND cchu.course_chapter_id = '6221e544-45a5-4fe8-8347-c10729a77248'
UNION ALL
SELECT 
  title AS "title",
  description AS "description",
  content AS "content",
  image_path AS "image",
  'f' AS "completed",
  CASE WHEN EXISTS(
    SELECT *
    FROM test AS t
    INNER JOIN course_chapter AS cch2
      ON cch2.id = t.course_chapter_id
    WHERE cch2.id = '6221e544-45a5-4fe8-8347-c10729a77248'
  ) THEN 't' ELSE 'f' END AS "has_test"
FROM course_chapter 
WHERE id = '6221e544-45a5-4fe8-8347-c10729a77248' AND NOT EXISTS(

SELECT 
  cch1.title AS "title",
  cch1.description AS "description",
  cch1.content AS "content",
  cch1.image_path AS "image",
  cchu1.completed AS "completed"
FROM users AS u1
JOIN course_chapter_user AS cchu1 ON cchu1.user_id = u1.id
JOIN course_chapter AS cch1 ON cch1.id = cchu1.course_chapter_id
WHERE u1.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
  AND cchu1.course_chapter_id = '6221e544-45a5-4fe8-8347-c10729a77248'

);




SELECT 
  cch.title AS "title",
  cch.description AS "description",
  cch.content AS "content",
  cch.image_path AS "image",
  cchu.completed AS "completed"
FROM users AS u
JOIN course_chapter_user AS cchu ON cchu.user_id = u.id
JOIN course_chapter AS cch ON cch.id = cchu.course_chapter_id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
  AND cchu.course_chapter_id = '47562c00-a10c-49fd-bb9a-b382e4de4847'
UNION SELECT
  cch1.title AS "title",
  cch1.description AS "description",
  cch1.content AS "content",
  cch1.image_path AS "image",
  null
FROM course_chapter AS cch1
WHERE cch1.id = '47562c00-a10c-49fd-bb9a-b382e4de4847';



-- data for a tests page

SELECT
    t.title
FROM test AS t
WHERE t.course_chapter_id = '47562c00-a10c-49fd-bb9a-b382e4de4847';

SELECT DISTINCT
    t.id,
    t.title,
    tu.passed AS "passed"
FROM test AS t
CROSS JOIN users AS u
JOIN test_user AS tu
    ON tu.user_id = u.id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
  AND t.course_chapter_id = '47562c00-a10c-49fd-bb9a-b382e4de4847';


SELECT
  t.id, 
  t.title,
  tu.passed AS "passed"
FROM users AS u
JOIN test_user AS tu
  ON tu.user_id = u.id
FULL JOIN test AS t ON t.id = tu.test_id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd'
  AND t.course_chapter_id = '6221e544-45a5-4fe8-8347-c10729a77248'
UNION ALL SELECT
  t1.id,
  t1.title,
  NULL AS "passed"
FROM test AS t1
JOIN test_user AS tu1
  ON tu1.test_id = t1.id
WHERE t1.id <> tu1.test_id
  AND t1.course_chapter_id = '6221e544-45a5-4fe8-8347-c10729a77248';

'6221e544-45a5-4fe8-8347-c10729a77248'


-- data for a course test page

SELECT
  t.title AS "test",
  tq.title AS "question",
  ta.title AS "answer",
  ta.correct AS "correct"
FROM test AS t
JOIN test_question AS tq ON tq.test_id = t.id
JOIN test_answer AS ta ON ta.test_question_id = tq.id
WHERE t.id = '4a5a4b7f-00bc-4b24-8876-f31b820f3845';


SELECT
  t.title AS "test",
  tu.attempts AS "attempts",
  tu.passed AS "passed",
  tq.title AS "question",
  ta.title AS "answer",
  ta.correct AS "correct"
FROM users AS u
CROSS JOIN test AS t
JOIN test_user AS tu ON tu.test_id = t.id
JOIN test_question AS tq ON tq.test_id = t.id
JOIN test_answer AS ta ON ta.test_question_id = tq.id
WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd' AND t.id = '4a5a4b7f-00bc-4b24-8876-f31b820f3845';

UNION ALL
SELECT
  t.title AS "test",
  0 AS "attempts",
  'f' AS "passed",
  tq.title AS "question",
  ta.title AS "answer",
  ta.correct AS "correct"
FROM test as t
JOIN test_question AS tq ON tq.test_id = t.id
JOIN test_answer AS ta ON ta.test_question_id = tq.id
WHERE t.id = 'fba04b99-3f84-47b0-afbe-956f99bf4be7'
  AND NOT EXISTS(
    SELECT
      t.title AS "test",
      tu.attempts AS "attempts",
      tu.passed AS "passed",
      tq.title AS "question",
      ta.title AS "answer",
      ta.correct AS "correct"
    FROM users AS u
    CROSS JOIN test AS t
    JOIN test_user AS pt ON tu.test_id = t.id
    JOIN test_question AS tq ON tq.test_id = t.id
    JOIN test_answer AS ta ON ta.test_question_id = tq.id
    WHERE u.id = 'eda70622-a3ab-4d7b-b3a4-82a9be4441fd' AND t.id = 'fba04b99-3f84-47b0-afbe-956f99bf4be7'
);


-- data for a profile page
SELECT
  u.nickname AS "username",
  u.email AS "email", 
  u.password AS "password"
FROM users AS u
WHERE u.id = '' AND password = '';




with AddressesToDelete as (
    select AddressId from Addresses a 
    join PlanetsDestroyed pd on pd.PlanetName = a.PlanetName
),
PeopleDeleted as (
    delete from People 
    where AddressId in (select * from AddressesToDelete)
    and OffPlanet = false 
    and TrophyKill = false
    returning Id
),
PeopleMissed as (
    update People 
    set AddressId=null, dead=(OffPlanet=false)
    where AddressId in (select * from AddressesToDelete)
    returning id
)
Delete from Addresses where AddressId in (select * from AddressesToDelete)



with AddressesToDelete as (
    select AddressId from Addresses a 
    join PlanetsDestroyed pd on pd.PlanetName = a.PlanetName
),
PeopleDeleted as (
    delete from People 
    where AddressId in (select * from AddressesToDelete)
    and OffPlanet = false 
    and TrophyKill = false
    returning Id
),
PeopleMissed as (
    update People 
    set AddressId=null, dead=(OffPlanet=false)
    where AddressId in (select * from AddressesToDelete)
    returning id
)
Delete from Addresses where AddressId in (select * from AddressesToDelete)

WITH 
TestUserRElDeleted AS (
  delete from test_user
  where test_id = ''
  RETURNING test_id
),
QuestionToDelete AS (
  SELECT id FROM test_question
  WHERE test_id IN TestUserRElDeleted
  RETURNING id
),
AnswerDeleted AS (
  delete from test_answer
  where test_question_id = id IN QuestionToDelete
),
TestDeleted AS (
  delete from test
  where id = ''
)




test
  test_question
    test_answer
  test_user
