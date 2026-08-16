# Dev 2 Test Script and Report

## Test Information

**Project:** Mock Sprint 
**Feature:** Login Restyling and Team Page  
**Role:** Dev 2 - Tester
**Tester:** Nihal Reddy  
**Environment:** https://garage-boilerplate-basic-frontend-five.vercel.app/
**Date:** 16 August 2026

## Our Objective
This file's purpose is to fully verify that the restyled Login Page and Team Page are working correctly on the deployement rather than Localhost.

The testing covers the successful login flow, redirect to the Team Page, required Team Page content, Invalid login behaviour, long-blurb handling.

## Task 6 - Happy Path Testing

## Test 1 - Valid Login

**Steps Followed:**
1. Click to open the deployed Login Page
2. Enter Valid Login Credentials
3. Click on the Log In button

**Expected Result:**
The user, after entering valid login credentials, should be authenticated successfully.

**Actual Result:**
Valid Login Credentials were accepted Successfully

**Status:** PASS

_________________________________________

## Test 2 - Redirect to Team Page

**Steps Followed:**
1. Enter Valid Login Credentials for successful login
2. Team Page opens after login


**Expected Result:**
After a successful login, the user is redirected to the Team Page

**Actual Result:**
The user was redirected successfully to the Team Page

**Status:** PASS

_________________________________________

## Test 3 - Required Team Page Content

**Steps Followed:**
1. Team Page opens after login
2. Check the team members information
3. Check each team member card


**Expected Result:**
The team page should display the required team information. 
Each member should have their Name, Role, Photo or placeholder, and a short blurb displayed as per the approved designs in a clear and consistent way.

**Actual Result:**
There are 5 members.
All required team member information is displayed correctly. Member names displayed:
    1. Nawres Kas Toma
    2. Scarlet Heng
    3. Arman Gholami
    4. Minh Quang Tran
    5. Nihal Reddy Gaddam.
Member roles, photos, blurbs, were clearly visible.

**Status:** PASS

## Task 6 Result

**Result:** PASS

The happy-path flow worked successfully on the deployed application. Valid login worked, the user was redirected to the Team Page, and the required Team Page content displayed correctly.
