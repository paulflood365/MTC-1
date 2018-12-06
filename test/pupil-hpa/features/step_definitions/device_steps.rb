Then(/^I should see device information populated in local storage$/) do
  device_info = JSON.parse(page.evaluate_script('window.localStorage.getItem("device");'))
  check_device_information(device_info)
end

Then(/^the device information should be persisted to the DB$/) do
  device_info = JSON.parse(page.evaluate_script('window.localStorage.getItem("device");'))
  check_code = JSON.parse(page.evaluate_script('window.localStorage.getItem("pupil");'))['checkCode']
  wait_until(60, 1){SqlDbHelper.get_check(check_code)['id']}
  check_id = SqlDbHelper.get_check(check_code)['id']
  wait_until(60, 1){SqlDbHelper.get_check_result(check_id)}
  data = SqlDbHelper.get_check_result(check_id)
  local_info = JSON.parse data['payload']
  db_device_info = local_info['device']
  device_info['appUsageCounter']=1
  expect(db_device_info).to eql device_info
end

When(/^I go from the instructions page to the complete page$/) do
  confirmation_page.read_instructions.click
  start_page.start_warm_up.click
  warm_up_page.start_now.click
  step "I complete the warm up questions using the numpad"
  warm_up_complete_page.start_check.click
  mtc_check_start_page.start_now.click
  questions = JSON.parse page.evaluate_script('window.localStorage.getItem("questions");')
  @answers = check_page.complete_check_with_correct_answers(questions.size,'numpad')
  complete_page.wait_for_complete_page
  expect(complete_page).to have_completion_text
end


When(/^I have completed 2 checks$/) do
  step 'I am on the complete page'
  visit ENV["PUPIL_BASE_URL"] + '/sign-out'
  step 'I am on the complete page'
end

Then(/^the app counter should be set to (\d+)$/) do |count|
  check_code = JSON.parse(page.evaluate_script('window.localStorage.getItem("pupil");'))['checkCode']
  check_id = SqlDbHelper.get_check(check_code)['id']
  expect(JSON.parse(SqlDbHelper.get_check_result(check_id)['payload'])['device']['appUsageCounter']).to eql count
end

Given(/^I have refreshed a page during the check$/) do
  step 'I am on question 1 of the check'
  step 'I attempt to refresh the page'
  step 'the next question has loaded so I continue with the check'
  check_code = JSON.parse(page.evaluate_script('window.localStorage.getItem("pupil");'))['checkCode']
  data = SqlDbHelper.get_check_data(check_code)
  local_info = JSON.parse data['data']
  @db_device_info = local_info['data']['device']
end
