import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface TimeLogEntry {
  date: string;
  hours: number;
  userId: string;
}

interface Task {
  id: string;
  timeLogs?: TimeLogEntry[];
}

interface User {
  id: string;
  name: string;
}

interface UserEfficiency {
  userId: string;
  name: string;
  totalMinutes: number; // Changed from totalHours
  taskCount: number;
  avgMinutesPerTask: number; // Changed from avgHoursPerTask
}

export function TimeLog() {
  const [efficiencyData, setEfficiencyData] = useState<UserEfficiency[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEfficiencyData = async () => {
      // Fetch users to map IDs to names
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersList);

      const taskSnap = await getDocs(collection(db, 'tasks'));

      const efficiencyMap: { [userId: string]: { totalMinutes: number; taskCount: number } } = {};

      taskSnap.docs.forEach(docSnap => {
        const task = docSnap.data() as Task;
        const uniqueUsers = new Set<string>();

        task.timeLogs?.forEach(log => {
          const userId = log.userId;
          uniqueUsers.add(userId);

          if (!efficiencyMap[userId]) {
            efficiencyMap[userId] = { totalMinutes: 0, taskCount: 0 };
          }

          efficiencyMap[userId].totalMinutes += log.hours * 60; // Convert hours to minutes
        });

        uniqueUsers.forEach(userId => {
          efficiencyMap[userId].taskCount += 1;
        });
      });

      const result: UserEfficiency[] = Object.entries(efficiencyMap).map(([userId, data]) => {
        const user = usersList.find(u => u.id === userId);
        return {
          userId,
          name: user ? user.name : userId,
          totalMinutes: parseFloat(data.totalMinutes.toFixed(2)), // Changed from totalHours
          taskCount: data.taskCount,
          avgMinutesPerTask: data.taskCount > 0 ? parseFloat((data.totalMinutes / data.taskCount).toFixed(2)) : 0, // Changed from avgHoursPerTask
        };
      });

      setEfficiencyData(result);
      setLoading(false);
    };

    fetchEfficiencyData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Efficiency Report</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : efficiencyData.length === 0 ? (
        <p className="text-gray-500">No time logs found.</p>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Total Minutes by User</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={efficiencyData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalMinutes" fill="#3b82f6" name="Total Minutes" /> {/* Changed from totalHours */}
                <Bar dataKey="avgMinutesPerTask" fill="#10b981" name="Avg Minutes/Task" /> {/* Changed from avgHoursPerTask */}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table Summary */}
          <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border">User Name</th>
                  <th className="p-3 border">Total Minutes</th> {/* Changed from Total Hours */}
                  <th className="p-3 border">Tasks Involved</th>
                  <th className="p-3 border">Avg Minutes / Task</th> {/* Changed from Avg Hours / Task */}
                </tr>
              </thead>
              <tbody>
                {efficiencyData.map(user => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="p-3 border">{user.name}</td>
                    <td className="p-3 border">{user.totalMinutes}</td> {/* Changed from totalHours */}
                    <td className="p-3 border">{user.taskCount}</td>
                    <td className="p-3 border">{user.avgMinutesPerTask}</td> {/* Changed from avgHoursPerTask */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}