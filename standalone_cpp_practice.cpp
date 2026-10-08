/*
 * standalone_cpp_practice.cpp
 * ------------------------------------------------------------
 * Standalone C++17 practice/demo program.
 * It is intentionally independent of the main project codebase.
 * Build: g++ -std=c++17 standalone_cpp_practice.cpp -o practice
 *
 * Topics demonstrated:
 * - classes and structs
 * - vectors, maps, sets, queues
 * - sorting and searching
 * - basic statistics
 * - file-independent utility functions
 * - simple menu-driven execution
 */

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

struct Student {
    int id{};
    string name;
    double score{};

    bool operator<(const Student& other) const {
        return score > other.score;
    }
};

class ScoreBook {
private:
    vector<Student> students;

public:
    void addStudent(int id, const string& name, double score) {
        students.push_back({id, name, score});
    }

    bool empty() const {
        return students.empty();
    }

    size_t size() const {
        return students.size();
    }

    double average() const {
        if (students.empty()) return 0.0;
        double total = accumulate(
            students.begin(), students.end(), 0.0,
            [](double sum, const Student& s) { return sum + s.score; }
        );
        return total / students.size();
    }

    double highest() const {
        if (students.empty()) return 0.0;
        return max_element(
            students.begin(), students.end(),
            [](const Student& a, const Student& b) {
                return a.score < b.score;
            }
        )->score;
    }

    double lowest() const {
        if (students.empty()) return 0.0;
        return min_element(
            students.begin(), students.end(),
            [](const Student& a, const Student& b) {
                return a.score < b.score;
            }
        )->score;
    }

    vector<Student> ranked() const {
        vector<Student> result = students;
        sort(result.begin(), result.end());
        return result;
    }

    map<string, int> gradeDistribution() const {
        map<string, int> grades;
        for (const auto& s : students) {
            if (s.score >= 90) grades["A+"]++;
            else if (s.score >= 80) grades["A"]++;
            else if (s.score >= 70) grades["B"]++;
            else if (s.score >= 60) grades["C"]++;
            else if (s.score >= 50) grades["D"]++;
            else grades["F"]++;
        }
        return grades;
    }

    const Student* findById(int id) const {
        for (const auto& student : students) {
            if (student.id == id) return &student;
        }
        return nullptr;
    }

    void printTable() const {
        cout << "\nID\tName\t\tScore\n";
        cout << "--------------------------------\n";
        for (const auto& s : students) {
            cout << s.id << '\t'
                 << left << setw(16) << s.name
                 << right << fixed << setprecision(2)
                 << s.score << '\n';
        }
    }

    void printStatistics() const {
        cout << "\nStatistics\n";
        cout << "----------\n";
        cout << "Students : " << size() << '\n';
        cout << "Average  : " << fixed << setprecision(2) << average() << '\n';
        cout << "Highest  : " << highest() << '\n';
        cout << "Lowest   : " << lowest() << '\n';

        cout << "\nGrade distribution:\n";
        for (const auto& [grade, count] : gradeDistribution()) {
            cout << "  " << grade << " -> " << count << '\n';
        }
    }

    void printRanking() const {
        auto result = ranked();
        cout << "\nRanking\n";
        cout << "-------\n";

        int rank = 1;
        for (const auto& s : result) {
            cout << rank++ << ". "
                 << setw(16) << left << s.name
                 << " " << fixed << setprecision(2)
                 << s.score << '\n';
        }
    }
};

vector<int> generateSequence(int n) {
    vector<int> values;
    values.reserve(n);

    for (int i = 1; i <= n; ++i) {
        int value = (i * i + 3 * i + 7) % 100;
        values.push_back(value);
    }

    return values;
}

void printVector(const vector<int>& values) {
    cout << "\nGenerated sequence:\n";
    for (size_t i = 0; i < values.size(); ++i) {
        cout << setw(3) << values[i];
        if ((i + 1) % 10 == 0) cout << '\n';
    }
    cout << '\n';
}

int countEven(const vector<int>& values) {
    return count_if(
        values.begin(), values.end(),
        [](int value) { return value % 2 == 0; }
    );
}

int countOdd(const vector<int>& values) {
    return static_cast<int>(values.size()) - countEven(values);
}

int sumValues(const vector<int>& values) {
    return accumulate(values.begin(), values.end(), 0);
}

double median(vector<int> values) {
    if (values.empty()) return 0.0;

    sort(values.begin(), values.end());
    const size_t middle = values.size() / 2;

    if (values.size() % 2 == 0) {
        return (values[middle - 1] + values[middle]) / 2.0;
    }

    return values[middle];
}

void demonstrateAlgorithms() {
    auto values = generateSequence(30);

    printVector(values);

    cout << "Count of even values : " << countEven(values) << '\n';
    cout << "Count of odd values  : " << countOdd(values) << '\n';
    cout << "Sum of values        : " << sumValues(values) << '\n';
    cout << "Median               : " << median(values) << '\n';

    vector<int> sorted = values;
    sort(sorted.begin(), sorted.end());

    cout << "\nSorted values:\n";
    for (int value : sorted) {
        cout << value << ' ';
    }
    cout << '\n';

    int target = 42;
    bool found = binary_search(sorted.begin(), sorted.end(), target);

    cout << "Binary search for " << target << ": "
         << (found ? "found" : "not found") << '\n';
}

void demonstrateContainers() {
    cout << "\nContainer demonstration\n";
    cout << "-----------------------\n";

    set<string> technologies = {
        "C++", "Next.js", "TypeScript", "SQL", "Git"
    };

    cout << "Set contents:\n";
    for (const auto& item : technologies) {
        cout << "  - " << item << '\n';
    }

    map<string, int> visits = {
        {"home", 12},
        {"dashboard", 27},
        {"profile", 9},
        {"about", 6}
    };

    cout << "\nPage counters:\n";
    for (const auto& [page, count] : visits) {
        cout << "  " << setw(10) << left << page
             << count << '\n';
    }

    queue<string> tasks;
    tasks.push("Validate input");
    tasks.push("Process records");
    tasks.push("Generate report");
    tasks.push("Finish");

    cout << "\nQueue processing:\n";
    while (!tasks.empty()) {
        cout << "  processing: " << tasks.front() << '\n';
        tasks.pop();
    }
}

void loadSampleStudents(ScoreBook& book) {
    book.addStudent(101, "Aarav", 91.5);
    book.addStudent(102, "Diya", 84.0);
    book.addStudent(103, "Kabir", 76.5);
    book.addStudent(104, "Meera", 88.0);
    book.addStudent(105, "Rohan", 67.5);
    book.addStudent(106, "Anaya", 94.0);
    book.addStudent(107, "Arjun", 73.0);
    book.addStudent(108, "Ishita", 81.5);
    book.addStudent(109, "Vihaan", 59.0);
    book.addStudent(110, "Sara", 86.5);
}

void searchStudent(const ScoreBook& book) {
    cout << "\nEnter student ID: ";

    int id;
    if (!(cin >> id)) {
        cin.clear();
        cin.ignore(10000, '\n');
        cout << "Invalid ID.\n";
        return;
    }

    const Student* student = book.findById(id);

    if (student == nullptr) {
        cout << "Student not found.\n";
        return;
    }

    cout << "Found: " << student->name
         << " | Score: " << fixed << setprecision(2)
         << student->score << '\n';
}

void printMenu() {
    cout << "\n====================================\n";
    cout << "     C++ Standalone Practice Lab\n";
    cout << "====================================\n";
    cout << "1. Show student table\n";
    cout << "2. Show statistics\n";
    cout << "3. Show ranking\n";
    cout << "4. Search student\n";
    cout << "5. STL containers demo\n";
    cout << "6. Algorithms demo\n";
    cout << "0. Exit\n";
    cout << "Choose: ";
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    ScoreBook book;
    loadSampleStudents(book);

    cout << "Standalone C++17 Practice Program\n";
    cout << "This file has no dependency on the main application.\n";

    while (true) {
        printMenu();

        int choice;
        if (!(cin >> choice)) {
            cin.clear();
            cin.ignore(10000, '\n');
            cout << "Please enter a number.\n";
            continue;
        }

        switch (choice) {
            case 1:
                book.printTable();
                break;

            case 2:
                book.printStatistics();
                break;

            case 3:
                book.printRanking();
                break;

            case 4:
                searchStudent(book);
                break;

            case 5:
                demonstrateContainers();
                break;

            case 6:
                demonstrateAlgorithms();
                break;

            case 0:
                cout << "\nExiting practice program.\n";
                return 0;

            default:
                cout << "Unknown option. Try again.\n";
        }
    }
}
