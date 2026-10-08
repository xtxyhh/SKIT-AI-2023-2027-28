/*
 * C++ Algorithms & Data Structures Practice
 * -----------------------------------------
 * Standalone educational/demo file.
 * This file intentionally has no dependencies on the main project.
 *
 * Topics demonstrated:
 * - Arrays and vectors
 * - Strings
 * - Searching and sorting
 * - Prefix sums
 * - Two pointers
 * - Sliding window
 * - Stack / queue
 * - Linked list
 * - Binary search tree
 * - Graph traversal
 * - Dynamic programming
 * - Hashing
 * - Basic statistics/helpers
 *
 * Build:
 *   g++ -std=c++17 -O2 cpp_practice_algorithms.cpp -o cpp_practice
 */

#include <algorithm>
#include <cmath>
#include <cctype>
#include <functional>
#include <iostream>
#include <limits>
#include <numeric>
#include <queue>
#include <random>
#include <set>
#include <stack>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

using namespace std;

// ---------- Array helpers ----------

int linearSearch(const vector<int>& a, int target) {
    for (int i = 0; i < static_cast<int>(a.size()); ++i) {
        if (a[i] == target) return i;
    }
    return -1;
}

int binarySearchIndex(const vector<int>& a, int target) {
    int left = 0, right = static_cast<int>(a.size()) - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;

        if (a[mid] == target) return mid;
        if (a[mid] < target) left = mid + 1;
        else right = mid - 1;
    }

    return -1;
}

void selectionSort(vector<int>& a) {
    for (int i = 0; i < static_cast<int>(a.size()); ++i) {
        int smallest = i;

        for (int j = i + 1; j < static_cast<int>(a.size()); ++j) {
            if (a[j] < a[smallest]) {
                smallest = j;
            }
        }

        swap(a[i], a[smallest]);
    }
}

void bubbleSort(vector<int>& a) {
    for (int i = 0; i < static_cast<int>(a.size()); ++i) {
        bool changed = false;

        for (int j = 0; j + 1 < static_cast<int>(a.size()) - i; ++j) {
            if (a[j] > a[j + 1]) {
                swap(a[j], a[j + 1]);
                changed = true;
            }
        }

        if (!changed) break;
    }
}

vector<long long> prefixSums(const vector<int>& a) {
    vector<long long> prefix(a.size() + 1, 0);

    for (size_t i = 0; i < a.size(); ++i) {
        prefix[i + 1] = prefix[i] + a[i];
    }

    return prefix;
}

long long rangeSum(const vector<long long>& prefix, int left, int right) {
    if (left < 0 || right < left || right + 1 >= static_cast<int>(prefix.size())) {
        return 0;
    }

    return prefix[right + 1] - prefix[left];
}

// ---------- Two pointers / sliding window ----------

bool hasPairWithSum(vector<int> a, int target) {
    sort(a.begin(), a.end());

    int left = 0;
    int right = static_cast<int>(a.size()) - 1;

    while (left < right) {
        long long sum = static_cast<long long>(a[left]) + a[right];

        if (sum == target) return true;
        if (sum < target) ++left;
        else --right;
    }

    return false;
}

int longestUniqueSubstring(const string& s) {
    unordered_map<char, int> lastSeen;
    int left = 0;
    int best = 0;

    for (int right = 0; right < static_cast<int>(s.size()); ++right) {
        char ch = s[right];

        if (lastSeen.count(ch) && lastSeen[ch] >= left) {
            left = lastSeen[ch] + 1;
        }

        lastSeen[ch] = right;
        best = max(best, right - left + 1);
    }

    return best;
}

int maxWindowSum(const vector<int>& a, int k) {
    if (k <= 0 || k > static_cast<int>(a.size())) return 0;

    int current = 0;

    for (int i = 0; i < k; ++i) {
        current += a[i];
    }

    int best = current;

    for (int i = k; i < static_cast<int>(a.size()); ++i) {
        current += a[i];
        current -= a[i - k];
        best = max(best, current);
    }

    return best;
}

// ---------- Stack / queue exercises ----------

bool balancedBrackets(const string& s) {
    stack<char> st;

    for (char ch : s) {
        if (ch == '(' || ch == '[' || ch == '{') {
            st.push(ch);
            continue;
        }

        if (ch != ')' && ch != ']' && ch != '}') continue;
        if (st.empty()) return false;

        char open = st.top();
        st.pop();

        bool valid =
            (open == '(' && ch == ')') ||
            (open == '[' && ch == ']') ||
            (open == '{' && ch == '}');

        if (!valid) return false;
    }

    return st.empty();
}

vector<int> nextGreaterElements(const vector<int>& a) {
    vector<int> answer(a.size(), -1);
    stack<int> indices;

    for (int i = 0; i < static_cast<int>(a.size()); ++i) {
        while (!indices.empty() && a[i] > a[indices.top()]) {
            answer[indices.top()] = a[i];
            indices.pop();
        }

        indices.push(i);
    }

    return answer;
}

vector<int> queueSimulation(const vector<int>& values) {
    queue<int> q;
    vector<int> result;

    for (int value : values) {
        q.push(value);
    }

    while (!q.empty()) {
        int current = q.front();
        q.pop();

        result.push_back(current * 2);
    }

    return result;
}

// ---------- Linked list ----------

struct ListNode {
    int value;
    ListNode* next;

    explicit ListNode(int v) : value(v), next(nullptr) {}
};

void appendNode(ListNode*& head, int value) {
    ListNode* node = new ListNode(value);

    if (!head) {
        head = node;
        return;
    }

    ListNode* current = head;

    while (current->next) {
        current = current->next;
    }

    current->next = node;
}

ListNode* reverseList(ListNode* head) {
    ListNode* previous = nullptr;
    ListNode* current = head;

    while (current) {
        ListNode* next = current->next;
        current->next = previous;
        previous = current;
        current = next;
    }

    return previous;
}

void printList(const ListNode* head) {
    const ListNode* current = head;

    while (current) {
        cout << current->value;

        if (current->next) {
            cout << " -> ";
        }

        current = current->next;
    }

    cout << '\n';
}

void deleteList(ListNode*& head) {
    while (head) {
        ListNode* next = head->next;
        delete head;
        head = next;
    }
}

// ---------- Binary search tree ----------

struct TreeNode {
    int value;
    TreeNode* left;
    TreeNode* right;

    explicit TreeNode(int v)
        : value(v), left(nullptr), right(nullptr) {}
};

TreeNode* insertTree(TreeNode* root, int value) {
    if (!root) return new TreeNode(value);

    if (value < root->value) {
        root->left = insertTree(root->left, value);
    } else {
        root->right = insertTree(root->right, value);
    }

    return root;
}

bool containsTree(TreeNode* root, int target) {
    if (!root) return false;
    if (root->value == target) return true;

    if (target < root->value) {
        return containsTree(root->left, target);
    }

    return containsTree(root->right, target);
}

void inorder(TreeNode* root, vector<int>& result) {
    if (!root) return;

    inorder(root->left, result);
    result.push_back(root->value);
    inorder(root->right, result);
}

void deleteTree(TreeNode*& root) {
    if (!root) return;

    deleteTree(root->left);
    deleteTree(root->right);

    delete root;
    root = nullptr;
}

// ---------- Graph algorithms ----------

vector<vector<int>> makeGraph(int n) {
    return vector<vector<int>>(n);
}

void addEdge(vector<vector<int>>& graph, int u, int v, bool undirected = true) {
    graph[u].push_back(v);

    if (undirected) {
        graph[v].push_back(u);
    }
}

vector<int> bfs(const vector<vector<int>>& graph, int start) {
    vector<int> order;
    vector<bool> visited(graph.size(), false);
    queue<int> q;

    if (start < 0 || start >= static_cast<int>(graph.size())) {
        return order;
    }

    visited[start] = true;
    q.push(start);

    while (!q.empty()) {
        int node = q.front();
        q.pop();

        order.push_back(node);

        for (int neighbor : graph[node]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }

    return order;
}

void dfsRecursive(
    const vector<vector<int>>& graph,
    int node,
    vector<bool>& visited,
    vector<int>& order
) {
    visited[node] = true;
    order.push_back(node);

    for (int neighbor : graph[node]) {
        if (!visited[neighbor]) {
            dfsRecursive(graph, neighbor, visited, order);
        }
    }
}

vector<int> dfs(const vector<vector<int>>& graph, int start) {
    vector<int> order;
    vector<bool> visited(graph.size(), false);

    if (start < 0 || start >= static_cast<int>(graph.size())) {
        return order;
    }

    dfsRecursive(graph, start, visited, order);
    return order;
}

// ---------- Dynamic programming ----------

long long fibonacciDP(int n) {
    if (n < 0) return 0;
    if (n <= 1) return n;

    vector<long long> dp(n + 1, 0);
    dp[1] = 1;

    for (int i = 2; i <= n; ++i) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }

    return dp[n];
}

int minCoins(const vector<int>& coins, int amount) {
    if (amount < 0) return -1;

    const int INF = numeric_limits<int>::max() / 4;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;

    for (int current = 1; current <= amount; ++current) {
        for (int coin : coins) {
            if (coin <= 0 || coin > current) continue;

            if (dp[current - coin] != INF) {
                dp[current] = min(dp[current], dp[current - coin] + 1);
            }
        }
    }

    return dp[amount] == INF ? -1 : dp[amount];
}

int longestIncreasingSubsequence(const vector<int>& a) {
    vector<int> tails;

    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);

        if (it == tails.end()) {
            tails.push_back(x);
        } else {
            *it = x;
        }
    }

    return static_cast<int>(tails.size());
}

// ---------- Hashing / frequency ----------

unordered_map<int, int> frequencyMap(const vector<int>& a) {
    unordered_map<int, int> frequency;

    for (int x : a) {
        ++frequency[x];
    }

    return frequency;
}

int mostFrequentValue(const vector<int>& a) {
    if (a.empty()) return 0;

    unordered_map<int, int> frequency;
    int answer = a.front();
    int bestCount = 0;

    for (int x : a) {
        ++frequency[x];

        if (frequency[x] > bestCount) {
            bestCount = frequency[x];
            answer = x;
        }
    }

    return answer;
}

// ---------- String utilities ----------

bool isPalindrome(const string& s) {
    int left = 0;
    int right = static_cast<int>(s.size()) - 1;

    while (left < right) {
        if (s[left] != s[right]) return false;
        ++left;
        --right;
    }

    return true;
}

string normalizeWord(const string& s) {
    string result;

    for (char ch : s) {
        if (isalnum(static_cast<unsigned char>(ch))) {
            result += static_cast<char>(
                tolower(static_cast<unsigned char>(ch))
            );
        }
    }

    return result;
}

bool sentencePalindrome(const string& sentence) {
    return isPalindrome(normalizeWord(sentence));
}

vector<string> splitWords(const string& sentence) {
    vector<string> words;
    string current;

    for (char ch : sentence) {
        if (isspace(static_cast<unsigned char>(ch))) {
            if (!current.empty()) {
                words.push_back(current);
                current.clear();
            }
        } else {
            current += ch;
        }
    }

    if (!current.empty()) {
        words.push_back(current);
    }

    return words;
}

// ---------- Simple statistics ----------

double mean(const vector<int>& values) {
    if (values.empty()) return 0.0;

    long long total = accumulate(values.begin(), values.end(), 0LL);
    return static_cast<double>(total) / values.size();
}

double median(vector<int> values) {
    if (values.empty()) return 0.0;

    sort(values.begin(), values.end());

    size_t middle = values.size() / 2;

    if (values.size() % 2 == 1) {
        return values[middle];
    }

    return (values[middle - 1] + values[middle]) / 2.0;
}

double standardDeviation(const vector<int>& values) {
    if (values.empty()) return 0.0;

    double avg = mean(values);
    double squared = 0.0;

    for (int x : values) {
        double difference = x - avg;
        squared += difference * difference;
    }

    return sqrt(squared / values.size());
}

// ---------- Pretty printing ----------

void printVector(const vector<int>& values, const string& label) {
    cout << label << ": [";

    for (size_t i = 0; i < values.size(); ++i) {
        cout << values[i];

        if (i + 1 != values.size()) {
            cout << ", ";
        }
    }

    cout << "]\n";
}

void printLongLongVector(
    const vector<long long>& values,
    const string& label
) {
    cout << label << ": [";

    for (size_t i = 0; i < values.size(); ++i) {
        cout << values[i];

        if (i + 1 != values.size()) {
            cout << ", ";
        }
    }

    cout << "]\n";
}

void printFrequency(const unordered_map<int, int>& frequency) {
    vector<pair<int, int>> items(frequency.begin(), frequency.end());

    sort(items.begin(), items.end());

    cout << "Frequencies: ";

    for (const auto& [value, count] : items) {
        cout << value << "=" << count << " ";
    }

    cout << '\n';
}

// ---------- Demo ----------

int main() {
    cout << "C++ Algorithms and Data Structures Practice\n";
    cout << "============================================\n\n";

    vector<int> values = {12, 5, 19, 5, 7, 3, 14, 8, 5, 11};

    printVector(values, "Original");

    vector<int> selection = values;
    selectionSort(selection);
    printVector(selection, "Selection sort");

    vector<int> bubble = values;
    bubbleSort(bubble);
    printVector(bubble, "Bubble sort");

    cout << "Linear search for 14: "
         << linearSearch(values, 14) << '\n';

    cout << "Binary search for 11: "
         << binarySearchIndex(bubble, 11) << '\n';

    vector<long long> prefix = prefixSums(values);
    printLongLongVector(prefix, "Prefix sums");

    cout << "Range sum [2, 6]: "
         << rangeSum(prefix, 2, 6) << '\n';

    cout << "Pair with sum 20: "
         << (hasPairWithSum(values, 20) ? "yes" : "no") << '\n';

    cout << "Longest unique substring in 'algorithmic': "
         << longestUniqueSubstring("algorithmic") << '\n';

    cout << "Max window sum (k=3): "
         << maxWindowSum(values, 3) << '\n';

    cout << "Balanced brackets: "
         << (balancedBrackets("{[()]}") ? "yes" : "no") << '\n';

    vector<int> greater = nextGreaterElements(values);
    printVector(greater, "Next greater elements");

    vector<int> doubled = queueSimulation({1, 2, 3, 4, 5});
    printVector(doubled, "Queue simulation");

    ListNode* head = nullptr;

    for (int x : {10, 20, 30, 40, 50}) {
        appendNode(head, x);
    }

    cout << "Linked list: ";
    printList(head);

    head = reverseList(head);

    cout << "Reversed list: ";
    printList(head);

    deleteList(head);

    TreeNode* root = nullptr;

    for (int x : {40, 20, 60, 10, 30, 50, 70}) {
        root = insertTree(root, x);
    }

    vector<int> inorderValues;
    inorder(root, inorderValues);

    printVector(inorderValues, "BST inorder");

    cout << "BST contains 50: "
         << (containsTree(root, 50) ? "yes" : "no") << '\n';

    deleteTree(root);

    vector<vector<int>> graph = makeGraph(6);

    addEdge(graph, 0, 1);
    addEdge(graph, 0, 2);
    addEdge(graph, 1, 3);
    addEdge(graph, 2, 4);
    addEdge(graph, 3, 5);
    addEdge(graph, 4, 5);

    vector<int> bfsOrder = bfs(graph, 0);
    vector<int> dfsOrder = dfs(graph, 0);

    printVector(bfsOrder, "BFS");
    printVector(dfsOrder, "DFS");

    cout << "Fibonacci(20): " << fibonacciDP(20) << '\n';

    cout << "Minimum coins for 11 using {1,2,5}: "
         << minCoins({1, 2, 5}, 11) << '\n';

    cout << "LIS length: "
         << longestIncreasingSubsequence(
                {10, 9, 2, 5, 3, 7, 101, 18}
            )
         << '\n';

    unordered_map<int, int> frequency = frequencyMap(values);
    printFrequency(frequency);

    cout << "Most frequent value: "
         << mostFrequentValue(values) << '\n';

    cout << "Palindrome 'level': "
         << (isPalindrome("level") ? "yes" : "no") << '\n';

    cout << "Sentence palindrome: "
         << (sentencePalindrome("A man a plan a canal Panama")
                 ? "yes"
                 : "no")
         << '\n';

    vector<string> words =
        splitWords("data structures and algorithms in cpp");

    cout << "Split words: ";

    for (const string& word : words) {
        cout << word << " | ";
    }

    cout << '\n';

    cout << "Mean: " << mean(values) << '\n';
    cout << "Median: " << median(values) << '\n';
    cout << "Standard deviation: "
         << standardDeviation(values) << '\n';

    cout << "\nDemo completed successfully.\n";

    return 0;
}
