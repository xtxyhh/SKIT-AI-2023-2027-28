/*
 * Student Utility Toolkit
 * -----------------------
 * A standalone C++ practice program for managing sample student records.
 *
 * This file is intentionally self-contained and does not integrate with
 * or modify any other project component.
 *
 * Build:
 *   g++ -std=c++17 -Wall -Wextra -pedantic student_utility_toolkit.cpp -o student_toolkit
 *
 * Run:
 *   ./student_toolkit
 */

#include <algorithm>
#include <iomanip>
#include <iostream>
#include <limits>
#include <numeric>
#include <string>
#include <vector>

struct Student {
    int id{};
    std::string name;
    double attendance{};
    std::vector<double> marks;
};

constexpr int SUBJECT_COUNT = 5;
constexpr double PASS_MARK = 40.0;

void printLine(char ch = '-', int width = 68) {
    for (int i = 0; i < width; ++i) {
        std::cout << ch;
    }
    std::cout << '\n';
}

void printHeader(const std::string& title) {
    printLine('=');
    std::cout << "  " << title << '\n';
    printLine('=');
}

int readInt(const std::string& prompt, int minValue, int maxValue) {
    int value{};
    while (true) {
        std::cout << prompt;
        if (std::cin >> value && value >= minValue && value <= maxValue) {
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            return value;
        }
        std::cout << "Please enter a number from " << minValue
                  << " to " << maxValue << ".\n";
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    }
}

double readDouble(const std::string& prompt, double minValue,
                  double maxValue) {
    double value{};
    while (true) {
        std::cout << prompt;
        if (std::cin >> value && value >= minValue && value <= maxValue) {
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            return value;
        }
        std::cout << "Please enter a value from " << minValue
                  << " to " << maxValue << ".\n";
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    }
}

std::string readName() {
    std::string name;
    while (name.empty()) {
        std::cout << "Student name: ";
        std::getline(std::cin, name);
        if (name.empty()) {
            std::cout << "Name cannot be empty.\n";
        }
    }
    return name;
}

double totalMarks(const Student& student) {
    return std::accumulate(student.marks.begin(), student.marks.end(), 0.0);
}

double percentage(const Student& student) {
    if (student.marks.empty()) {
        return 0.0;
    }
    return totalMarks(student) / static_cast<double>(student.marks.size());
}

bool hasPassed(const Student& student) {
    return std::all_of(student.marks.begin(), student.marks.end(),
        [](double mark) { return mark >= PASS_MARK; });
}

std::string gradeFor(double score) {
    if (score >= 90.0) return "A+";
    if (score >= 80.0) return "A";
    if (score >= 70.0) return "B";
    if (score >= 60.0) return "C";
    if (score >= 50.0) return "D";
    if (score >= PASS_MARK) return "E";
    return "F";
}

int findStudentIndex(const std::vector<Student>& students, int id) {
    for (std::size_t i = 0; i < students.size(); ++i) {
        if (students[i].id == id) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

void addStudent(std::vector<Student>& students) {
    printHeader("Add Student");
    const int id = readInt("Student ID (1-999999): ", 1, 999999);
    if (findStudentIndex(students, id) != -1) {
        std::cout << "That ID already exists.\n";
        return;
    }

    Student student;
    student.id = id;
    student.name = readName();
    student.attendance = readDouble("Attendance percentage (0-100): ", 0, 100);

    student.marks.reserve(SUBJECT_COUNT);
    for (int subject = 0; subject < SUBJECT_COUNT; ++subject) {
        const std::string prompt =
            "Marks for subject " + std::to_string(subject + 1) + " (0-100): ";
        student.marks.push_back(readDouble(prompt, 0, 100));
    }

    students.push_back(student);
    std::cout << "Student added successfully.\n";
}
void printStudent(const Student& student) {
    printLine();
    std::cout << "ID:         " << student.id << '\n';
    std::cout << "Name:       " << student.name << '\n';
    std::cout << "Attendance: " << std::fixed << std::setprecision(1)
              << student.attendance << "%\n";
    std::cout << "Marks:      ";
    for (std::size_t i = 0; i < student.marks.size(); ++i) {
        std::cout << student.marks[i];
        if (i + 1 < student.marks.size()) std::cout << ", ";
    }
    std::cout << '\n';
    std::cout << "Total:      " << totalMarks(student) << " / "
              << SUBJECT_COUNT * 100 << '\n';
    std::cout << "Percentage: " << percentage(student) << "%\n";
    std::cout << "Grade:      " << gradeFor(percentage(student)) << '\n';
    std::cout << "Result:      " << (hasPassed(student) ? "PASS" : "NEEDS IMPROVEMENT")
              << '\n';
}
void listStudents(const std::vector<Student>& students) {
    printHeader("Student Records");
    if (students.empty()) {
        std::cout << "No records available. Add a student first.\n";
        return;
    }
    std::cout << std::left << std::setw(10) << "ID"
              << std::setw(25) << "Name"
              << std::setw(15) << "Percentage"
              << std::setw(12) << "Grade" << '\n';
    printLine();
    for (const Student& student : students) {
        std::cout << std::left << std::setw(10) << student.id
                  << std::setw(25) << student.name.substr(0, 24)
                  << std::setw(15) << std::fixed << std::setprecision(1)
                  << percentage(student)
                  << std::setw(12) << gradeFor(percentage(student)) << '\n';
    }
}
void searchStudent(const std::vector<Student>& students) {
    printHeader("Search Student");
    const int id = readInt("Enter student ID: ", 1, 999999);
    const int index = findStudentIndex(students, id);
    if (index == -1) {
        std::cout << "No student found with ID " << id << ".\n";
        return;
    }
    printStudent(students[static_cast<std::size_t>(index)]);
}
void showTopper(const std::vector<Student>& students) {
    printHeader("Top Performer");
    if (students.empty()) {
        std::cout << "No records available.\n";
        return;
    }
    const auto best = std::max_element(students.begin(), students.end(),
        [](const Student& first, const Student& second) {
            return percentage(first) < percentage(second);
        });
    std::cout << "Highest overall percentage:\n";
    printStudent(*best);
}
void sortByPercentage(std::vector<Student>& students) {
    std::sort(students.begin(), students.end(),
        [](const Student& first, const Student& second) {
            return percentage(first) > percentage(second);
        });
    std::cout << "Records sorted by percentage, highest first.\n";
}
void attendanceReport(const std::vector<Student>& students) {
    printHeader("Attendance Report");
    if (students.empty()) {
        std::cout << "No records available.\n";
        return;
    }
    int eligible = 0;
    for (const Student& student : students) {
        const bool meetsRequirement = student.attendance >= 75.0;
        if (meetsRequirement) ++eligible;
        std::cout << std::left << std::setw(25) << student.name
                  << std::setw(10) << student.attendance << "%  "
                  << (meetsRequirement ? "Eligible" : "Below 75%") << '\n';
    }
    printLine();
    std::cout << "Students meeting the 75% attendance guideline: "
              << eligible << " of " << students.size() << '\n';
}
void removeStudent(std::vector<Student>& students) {
    printHeader("Remove Student");
    const int id = readInt("Student ID to remove: ", 1, 999999);
    const auto found = std::find_if(students.begin(), students.end(),
        [id](const Student& student) { return student.id == id; });
    if (found == students.end()) {
        std::cout << "No matching student was found.\n";
        return;
    }
    std::cout << "Remove record for " << found->name << "? (1 = yes, 0 = no): ";
    const int confirm = readInt("", 0, 1);
    if (confirm == 1) {
        students.erase(found);
        std::cout << "Record removed.\n";
    } else {
        std::cout << "Removal cancelled.\n";
    }
}
void showMenu() {
    printHeader("Student Utility Toolkit");
    std::cout << "1. Add student\n";
    std::cout << "2. List all students\n";
    std::cout << "3. Search by ID\n";
    std::cout << "4. Show top performer\n";
    std::cout << "5. Sort by percentage\n";
    std::cout << "6. Attendance report\n";
    std::cout << "7. Remove student\n";
    std::cout << "0. Exit\n";
    printLine();
}
int main() {
    std::vector<Student> students;
    // A few sample records make it easy to explore the reports.
    students.push_back({101, "Aarav Sharma", 92.0, {88, 91, 84, 95, 89}});
    students.push_back({102, "Meera Singh", 78.0, {76, 82, 79, 85, 80}});
    students.push_back({103, "Kabir Verma", 68.0, {55, 62, 71, 59, 65}});
    bool running = true;
    while (running) {
        showMenu();
        const int choice = readInt("Choose an option: ", 0, 7);
        switch (choice) {
            case 1: addStudent(students); break;
            case 2: listStudents(students); break;
            case 3: searchStudent(students); break;
            case 4: showTopper(students); break;
            case 5: sortByPercentage(students); break;
            case 6: attendanceReport(students); break;
            case 7: removeStudent(students); break;
            case 0:
                running = false;
                std::cout << "Thanks for trying the Student Utility Toolkit.\n";
                break;
            default:
                std::cout << "Invalid option.\n";
        }
        if (running) {
            std::cout << "\nPress Enter to return to the menu...";
            std::cin.get();
        }
    }
    return 0;
}
