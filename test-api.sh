#!/bin/bash

# Chat & Message API - CURL Commands for Testing
# Lưu ý: Thay {{token}} bằng token thực tế sau khi login

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "🔐 AUTHENTICATION"
echo "=========================================="

# 1. Login as Seeker
echo -e "\n📌 Login as Seeker"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seeker@example.com",
    "password": "password123"
  }' | jq .

# Save token manually or use jq to extract
# SEEKER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" ... | jq -r '.access_token')

# 2. Login as Employee 1 (TechCorp)
echo -e "\n📌 Login as Employee 1 (TechCorp)"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@techcorp.com",
    "password": "password123"
  }' | jq .

# 3. Login as Employee 2 (StartupVN)
echo -e "\n📌 Login as Employee 2 (StartupVN)"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr2@startupvn.com",
    "password": "password123"
  }' | jq .

echo -e "\n=========================================="
echo "💬 CHAT API"
echo "=========================================="

# 4. Create Chat (Seeker → TechCorp)
echo -e "\n📌 Create Chat - Seeker to TechCorp"
curl -X POST "$BASE_URL/chat" \
  -H "Authorization: Bearer {{seekerToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 1
  }' | jq .

# 5. Create Chat (Seeker → StartupVN)
echo -e "\n📌 Create Chat - Seeker to StartupVN"
curl -X POST "$BASE_URL/chat" \
  -H "Authorization: Bearer {{seekerToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 2
  }' | jq .

# 6. Get All Chats (Seeker)
echo -e "\n📌 Get All Chats - Seeker"
curl -X GET "$BASE_URL/chat/me" \
  -H "Authorization: Bearer {{seekerToken}}" | jq .

# 7. Get Chat Detail
echo -e "\n📌 Get Chat Detail - Chat ID 1"
curl -X GET "$BASE_URL/chat/1" \
  -H "Authorization: Bearer {{seekerToken}}" | jq .

echo -e "\n=========================================="
echo "📨 MESSAGE API - SEND"
echo "=========================================="

# 8. Send Message from Seeker
echo -e "\n📌 Send Message - Seeker to Chat 1"
curl -X POST "$BASE_URL/message" \
  -H "Authorization: Bearer {{seekerToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 1,
    "content": "Hello TechCorp! I am interested in the Backend Developer position."
  }' | jq .

# 9. Send Message from Employee 1
echo -e "\n📌 Send Message - Employee 1 Reply"
curl -X POST "$BASE_URL/message" \
  -H "Authorization: Bearer {{employeeToken1}}" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 1,
    "content": "Hi John! Thank you for your interest. Can you tell us more about your experience?"
  }' | jq .

# 10. Send Message from Seeker (Follow-up)
echo -e "\n📌 Send Message - Seeker Follow-up"
curl -X POST "$BASE_URL/message" \
  -H "Authorization: Bearer {{seekerToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 1,
    "content": "I have 5 years of experience in Java backend development with Spring Boot."
  }' | jq .

# 11. Send Message to Chat 2
echo -e "\n📌 Send Message - Chat 2"
curl -X POST "$BASE_URL/message" \
  -H "Authorization: Bearer {{seekerToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 2,
    "content": "Hi StartupVN! Looking forward to discussing the Python role."
  }' | jq .

echo -e "\n=========================================="
echo "📥 MESSAGE API - RETRIEVE"
echo "=========================================="

# 12. Get Messages from Chat 1
echo -e "\n📌 Get Messages - Chat 1"
curl -X GET "$BASE_URL/message?chatId=1&limit=50&offset=0" \
  -H "Authorization: Bearer {{seekerToken}}" | jq .

# 13. Get Messages from Chat 2
echo -e "\n📌 Get Messages - Chat 2"
curl -X GET "$BASE_URL/message?chatId=2&limit=50&offset=0" \
  -H "Authorization: Bearer {{seekerToken}}" | jq .

# 14. Get Messages with Pagination
echo -e "\n📌 Get Messages - Pagination (limit=10)"
curl -X GET "$BASE_URL/message?chatId=1&limit=10&offset=0" \
  -H "Authorization: Bearer {{seekerToken}}" | jq .

echo -e "\n=========================================="
echo "❌ ERROR CASES - TESTING"
echo "=========================================="

# 15. Send Empty Message (Should Fail)
echo -e "\n📌 Send Empty Message (Expected: 400)"
curl -X POST "$BASE_URL/message" \
  -H "Authorization: Bearer {{seekerToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 1,
    "content": ""
  }' | jq .

# 16. Send Oversized Message (Should Fail)
echo -e "\n📌 Send Oversized Message (Expected: 400)"
curl -X POST "$BASE_URL/message" \
  -H "Authorization: Bearer {{seekerToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 1,
    "content": "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqualsxbnsnsxxxxx"
  }' | jq .

# 17. Access Chat Without Permission (Should Fail)
echo -e "\n📌 Access Chat Without Permission (Expected: 403)"
curl -X GET "$BASE_URL/chat/1" \
  -H "Authorization: Bearer {{employeeToken2}}" | jq .

# 18. Get Invalid Chat ID (Should Fail)
echo -e "\n📌 Get Invalid Chat ID (Expected: 404)"
curl -X GET "$BASE_URL/chat/99999" \
  -H "Authorization: Bearer {{seekerToken}}" | jq .

echo -e "\n=========================================="
echo "✅ Test Complete!"
echo "=========================================="
