
import requests
import sys
import time
from datetime import datetime

class BlogAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_post_id = None
        self.created_category_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password):
        """Test login and get token"""
        print("\n=== Testing Authentication ===")
        success, response = self.run_test(
            "Login with valid credentials",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"Token received: {self.token[:10]}...")
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, _ = self.run_test(
            "Login with invalid credentials",
            "POST",
            "auth/login",
            401,
            data={"username": "wrong", "password": "wrong"}
        )
        # This should fail with 401, so we invert the success check
        return success

    def test_verify_auth(self):
        """Test auth verification"""
        success, response = self.run_test(
            "Verify authentication",
            "GET",
            "auth/verify",
            200,
            auth=True
        )
        return success

    def test_get_categories(self):
        """Test getting all categories"""
        print("\n=== Testing Categories ===")
        success, response = self.run_test(
            "Get all categories",
            "GET",
            "categories",
            200
        )
        if success and isinstance(response, list):
            print(f"Found {len(response)} categories")
            for cat in response:
                print(f"  - {cat.get('name')}: {cat.get('description')}")
        return success

    def test_create_category(self):
        """Test creating a new category"""
        category_data = {
            "name": f"Test Category {datetime.now().strftime('%H%M%S')}",
            "description": "This is a test category created by the API tester"
        }
        success, response = self.run_test(
            "Create new category",
            "POST",
            "categories",
            200,
            data=category_data,
            auth=True
        )
        if success and 'id' in response:
            self.created_category_id = response['id']
            print(f"Created category with ID: {self.created_category_id}")
        return success

    def test_get_posts(self):
        """Test getting all posts"""
        print("\n=== Testing Posts ===")
        success, response = self.run_test(
            "Get all posts",
            "GET",
            "posts",
            200
        )
        if success and isinstance(response, list):
            print(f"Found {len(response)} posts")
            for post in response[:3]:  # Show only first 3 posts
                print(f"  - {post.get('title')} ({post.get('category')})")
        return success

    def test_create_post(self):
        """Test creating a new post"""
        # Get a category to use
        _, categories = self.run_test("Get categories for post creation", "GET", "categories", 200)
        category = categories[0]['name'] if categories and len(categories) > 0 else "Test Category"
        
        post_data = {
            "title": f"Test Post {datetime.now().strftime('%H%M%S')}",
            "content": "<p>This is a <strong>test post</strong> created by the API tester.</p>",
            "category": category,
            "image_url": "https://picsum.photos/800/400",
            "published": True
        }
        success, response = self.run_test(
            "Create new post",
            "POST",
            "posts",
            200,
            data=post_data,
            auth=True
        )
        if success and 'id' in response:
            self.created_post_id = response['id']
            print(f"Created post with ID: {self.created_post_id}")
        return success

    def test_get_post_by_id(self):
        """Test getting a post by ID"""
        if not self.created_post_id:
            print("❌ No post ID available to test")
            return False
            
        success, response = self.run_test(
            "Get post by ID",
            "GET",
            f"posts/{self.created_post_id}",
            200
        )
        if success:
            print(f"Retrieved post: {response.get('title')}")
        return success

    def test_update_post(self):
        """Test updating a post"""
        if not self.created_post_id:
            print("❌ No post ID available to test")
            return False
            
        update_data = {
            "title": f"Updated Test Post {datetime.now().strftime('%H%M%S')}",
            "content": "<p>This post has been <em>updated</em> by the API tester.</p>"
        }
        success, response = self.run_test(
            "Update post",
            "PUT",
            f"posts/{self.created_post_id}",
            200,
            data=update_data,
            auth=True
        )
        if success:
            print(f"Updated post title: {response.get('title')}")
        return success

    def test_delete_post(self):
        """Test deleting a post"""
        if not self.created_post_id:
            print("❌ No post ID available to test")
            return False
            
        success, _ = self.run_test(
            "Delete post",
            "DELETE",
            f"posts/{self.created_post_id}",
            200,
            auth=True
        )
        if success:
            print(f"Successfully deleted post with ID: {self.created_post_id}")
            self.created_post_id = None
        return success

def main():
    # Get the backend URL from the frontend .env file
    import os
    
    # Use the REACT_APP_BACKEND_URL from the frontend .env file
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                backend_url = line.strip().split('=')[1]
                break
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = BlogAPITester(backend_url)
    
    # Run tests
    auth_success = tester.test_login("admin", "Adoegyzseni")
    if not auth_success:
        print("❌ Authentication failed, stopping tests")
        return 1
    
    # Test invalid login
    tester.test_invalid_login()
    
    # Test auth verification
    tester.test_verify_auth()
    
    # Test categories
    tester.test_get_categories()
    tester.test_create_category()
    
    # Test posts
    tester.test_get_posts()
    tester.test_create_post()
    tester.test_get_post_by_id()
    tester.test_update_post()
    tester.test_delete_post()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
