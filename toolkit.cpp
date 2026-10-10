#include <algorithm>
#include <iomanip>
#include <iostream>
#include <limits>
#include <numeric>
#include <string>
#include <vector>
using namespace std;
struct Subject {
    string name;
    double marks;
    double maximum;
};
struct StudyTask {
    string title;
    int estimatedMinutes;
    bool completed;
};
int readInt(const string& prompt, int minimum, int maximum) {
    int value;
    while (true) {
        cout << prompt;
        if (cin >> value && value >= minimum && value <= maximum) {
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            return value;
        }
        cout << "Please enter a number between "
             << minimum << " and " << maximum << ".\n";
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
    }
}
double readDouble(const string& prompt, double minimum, double maximum) {
    double value;
    while (true) {
        cout << prompt;
        if (cin >> value && value >= minimum && value <= maximum) {
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            return value;
        }
        cout << "Please enter a valid value between "
             << minimum << " and " << maximum << ".\n";
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
    }
}
string readText(const string& prompt) {
    string value;
    cout << prompt;
    getline(cin, value);
    while (value.empty()) {
        cout << "This field cannot be empty. Try again: ";
        getline(cin, value);
    }
    return value;
}
void printLine(char symbol = '-', int width = 48) {
    cout << string(width, symbol) << '\n';
}
void showBanner() {
    printLine('=');
    cout << "             AI STUDENT TOOLKIT\n";
    cout << "       A small C++ learning utility\n";
    printLine('=');
}
void addSubject(vector<Subject>& subjects) {
    Subject subject;
    subject.name = readText("Subject name: ");
    subject.maximum = readDouble("Maximum marks: ", 1, 10000);
    subject.marks = readDouble("Marks obtained: ", 0, subject.maximum);
    subjects.push_back(subject);
    cout << "Subject added successfully.\n";
}
void listSubjects(const vector<Subject>& subjects) {
    if (subjects.empty()) {
        cout << "No subjects have been added yet.\n";
        return;
    }
    printLine();
    cout << left << setw(24) << "Subject"
         << right << setw(10) << "Marks"
         << setw(12) << "Percent\n";
    printLine();
    for (const Subject& subject : subjects) {
        double percent = subject.marks / subject.maximum * 100.0;
        cout << left << setw(24) << subject.name
             << right << setw(10) << fixed << setprecision(1)
             << subject.marks
             << setw(11) << percent << "%\n";
    }
    printLine();
}
void showGradeSummary(const vector<Subject>& subjects) {
    if (subjects.empty()) {
        cout << "Add at least one subject first.\n";
        return;
    }
    double obtained = 0;
    double possible = 0;
    for (const Subject& subject : subjects) {
        obtained += subject.marks;
        possible += subject.maximum;
    }
    double percentage = obtained / possible * 100.0;
    string grade;
    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B";
    else if (percentage >= 60) grade = "C";
    else if (percentage >= 50) grade = "D";
    else grade = "Needs improvement";
    cout << fixed << setprecision(2);
    cout << "Total obtained : " << obtained << '\n';
    cout << "Total possible : " << possible << '\n';
    cout << "Overall score  : " << percentage << "%\n";
    cout << "Practice grade : " << grade << '\n';
    cout << "Note: this is a simple percentage-based estimate, "
            "not an official university grade.\n";
}
void searchSubject(const vector<Subject>& subjects) {
    if (subjects.empty()) {
        cout << "There are no subjects to search.\n";
        return;
    }
    string query = readText("Enter a subject name to search: ");
    bool found = false;
    for (const Subject& subject : subjects) {
        if (subject.name.find(query) != string::npos) {
            cout << subject.name << ": "
                 << subject.marks << "/" << subject.maximum
                 << " marks\n";
            found = true;
        }
    }
    if (!found) {
        cout << "No matching subject found.\n";
    }
}
void sortSubjects(vector<Subject>& subjects) {
    if (subjects.size() < 2) {
        cout << "Add at least two subjects before sorting.\n";
        return;
    }
    sort(subjects.begin(), subjects.end(),
         [](const Subject& a, const Subject& b) {
             return (a.marks / a.maximum) > (b.marks / b.maximum);
         });
    cout << "Subjects sorted by percentage, highest first.\n";
    listSubjects(subjects);
}
void addStudyTask(vector<StudyTask>& tasks) {
    StudyTask task;
    task.title = readText("Task title: ");
    task.estimatedMinutes = readInt("Estimated minutes (1-600): ", 1, 600);
    task.completed = false;
    tasks.push_back(task);
    cout << "Study task added.\n";
}
void listStudyTasks(const vector<StudyTask>& tasks) {
    if (tasks.empty()) {
        cout << "Your study list is empty.\n";
        return;
    }
    printLine();
    for (size_t i = 0; i < tasks.size(); ++i) {
        cout << i + 1 << ". ["
             << (tasks[i].completed ? 'x' : ' ')
             << "] " << tasks[i].title
             << " (" << tasks[i].estimatedMinutes << " min)\n";
    }
    printLine();
}
void completeStudyTask(vector<StudyTask>& tasks) {
    if (tasks.empty()) {
        cout << "Add a task before marking it complete.\n";
        return;
    }
    listStudyTasks(tasks);
    int number = readInt(
        "Task number to toggle (0 cancels): ",
        0, static_cast<int>(tasks.size()));
    if (number == 0) {
        cout << "No changes made.\n";
        return;
    }
    StudyTask& task = tasks[static_cast<size_t>(number - 1)];
    task.completed = !task.completed;
    cout << "Task marked as "
         << (task.completed ? "completed.\n" : "pending.\n");
}
void showStudyStatistics(const vector<StudyTask>& tasks) {
    if (tasks.empty()) {
        cout << "No study tasks available for statistics.\n";
        return;
    }
    int completedCount = 0;
    int totalMinutes = 0;
    int completedMinutes = 0;
    for (const StudyTask& task : tasks) {
        totalMinutes += task.estimatedMinutes;
        if (task.completed) {
            ++completedCount;
            completedMinutes += task.estimatedMinutes;
        }
    }
    double completionRate =
        100.0 * completedCount / static_cast<double>(tasks.size());
    cout << "Tasks completed : " << completedCount
         << "/" << tasks.size() << '\n';
    cout << "Completion rate : " << fixed << setprecision(1)
         << completionRate << "%\n";
    cout << "Planned minutes : " << totalMinutes << '\n';
    cout << "Completed minutes: " << completedMinutes << '\n';
}
void showMenu() {
    printLine('=');
    cout << "1. Add a subject\n";
    cout << "2. List subjects\n";
    cout << "3. Show grade summary\n";
    cout << "4. Search subjects\n";
    cout << "5. Sort subjects by score\n";
    cout << "6. Add a study task\n";
    cout << "7. List study tasks\n";
    cout << "8. Toggle task completion\n";
    cout << "9. Show study statistics\n";
    cout << "0. Exit\n";
    printLine('=');
}
int main() {
    vector<Subject> subjects;
    vector<StudyTask> tasks;
    showBanner();
    bool running = true;
    while (running) {
        showMenu();
        int choice = readInt("Choose an option: ", 0, 9);
        cout << '\n';
        switch (choice) {
            case 1:
                addSubject(subjects);
                break;
            case 2:
                listSubjects(subjects);
                break;
            case 3:
                showGradeSummary(subjects);
                break;
            case 4:
                searchSubject(subjects);
                break;
            case 5:
                sortSubjects(subjects);
                break;
            case 6:
                addStudyTask(tasks);
                break;
            case 7:
                listStudyTasks(tasks);
                break;
            case 8:
                completeStudyTask(tasks);
                break;
            case 9:
                showStudyStatistics(tasks);
                break;
            case 0:
                running = false;
                cout << "Good luck with your studies!\n";
                break;
            default:
                cout << "Unknown option.\n";
        }
        if (running) {
            cout << '\n';
        }
    }
    return 0;
}
