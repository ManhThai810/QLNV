// --- Dữ liệu Tham chiếu & CSDL Giả lập (Sử dụng localStorage) ---
const EMPLOYEE_DATA_KEY = 'employeeMasterData';
const DEPARTMENT_DATA_KEY = 'departmentMasterData';
const ATTENDANCE_DATA_KEY = 'dailyAttendance'; 
const today = new Date().toISOString().split('T')[0]; // Định dạng YYYY-MM-DD
const TOTAL_EMPLOYEES_COMPANY = 100; // Giả định N_Total cho báo cáo (dùng cho 3 ô vuông)

// Hàm chung để lấy/lưu dữ liệu
const getData = (key) => JSON.parse(localStorage.getItem(key)) || [];
const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// --- Logic Trang department.html ---

let currentDepartmentEmployees = [];

function addEmployeeToDepartment() {
    const name = document.getElementById('emp-name').value.trim();
    const startDate = document.getElementById('emp-start-date').value;
    const position = document.getElementById('emp-position').value.trim();
    const phone = document.getElementById('emp-phone').value.trim(); 

    if (!name || !startDate || !position || !phone) {
        alert("Vui lòng nhập đầy đủ thông tin nhân viên, bao gồm SĐT.");
        return;
    }

    if (!/^\d{10,11}$/.test(phone)) {
        alert("SĐT Liên hệ phải là 10 hoặc 11 chữ số.");
        return;
    }
    
    const newEmployee = { 
        id: Date.now(), 
        name, 
        startDate, 
        position, 
        phone, 
        dept: document.getElementById('dept-name').value.trim() || "Chưa đặt tên",
        dob: 'N/A', 
        cccd: 'N/A'
    };

    currentDepartmentEmployees.push(newEmployee);
    renderDeptEmployeeTable();
    
    $('#addEmployeeModal').modal('hide');
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-start-date').value = '';
    document.getElementById('emp-position').value = '';
    document.getElementById('emp-phone').value = ''; 
}

function renderDeptEmployeeTable() {
    const tableBody = document.getElementById('employee-dept-table-body');
    if (!tableBody) return; 

    tableBody.innerHTML = currentDepartmentEmployees.map(emp => `
        <tr>
            <td>${emp.name}</td>
            <td>${emp.startDate}</td>
            <td>${emp.position}</td>
            <td>${emp.phone}</td> 
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteDeptEmployee(${emp.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function deleteDeptEmployee(id) {
    currentDepartmentEmployees = currentDepartmentEmployees.filter(emp => emp.id !== id);
    renderDeptEmployeeTable();
}

function saveDepartmentAndRedirect() {
    const deptName = document.getElementById('dept-name').value.trim();

    if (!deptName) {
        alert("Vui lòng nhập Tên Phòng Ban.");
        return;
    }

    if (currentDepartmentEmployees.length === 0) {
        alert("Vui lòng thêm ít nhất một nhân viên vào phòng ban.");
        return;
    }

    let depts = getData(DEPARTMENT_DATA_KEY);
    const deptId = Date.now();
    
    if (depts.some(d => d.name === deptName)) {
        alert("Phòng ban này đã tồn tại.");
        return;
    }

    // Ghi lại department ID là timestamp để dùng cho "Ngày Tạo Phòng Ban"
    depts.push({ id: deptId, name: deptName });
    saveData(DEPARTMENT_DATA_KEY, depts);

    let masterEmployees = getData(EMPLOYEE_DATA_KEY);
    currentDepartmentEmployees.forEach(emp => {
        emp.deptId = deptId;
        emp.dept = deptName; 
        masterEmployees.push(emp);
    });
    saveData(EMPLOYEE_DATA_KEY, masterEmployees);

    alert(`✅ Phòng ban "${deptName}" và ${currentDepartmentEmployees.length} nhân viên đã được lưu!`);
    
    window.location.href = 'employee_list.html';
}

if (document.getElementById('employee-dept-table-body')) {
    document.addEventListener('DOMContentLoaded', renderDeptEmployeeTable);
}


// --- Logic Trang employee_list.html (Điểm Danh) ---

let employeeList = getData(EMPLOYEE_DATA_KEY);
let currentAttendance = getData(ATTENDANCE_DATA_KEY);

function initializePopovers() {
    $('[data-toggle="popover"]').popover('dispose'); 
    
    $(function () {
        $('[data-toggle="popover"]').popover({
            trigger: 'click', // CHỈ CHỌN CLICK
            html: true
        });
        
        // Thêm event handler để đóng Popover khi click ra ngoài
        $('body').on('click', function (e) {
            $('[data-toggle="popover"]').each(function () {
                if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                    $(this).popover('hide');
                }
            });
        });
    });
}

function populateFilters() {
    const depts = getData(DEPARTMENT_DATA_KEY);
    const deptFilter = document.getElementById('filter-dept');
    const deptSelectModal = document.getElementById('emp-dept-list');
    const deptFilterManage = document.getElementById('filter-dept-manage'); // Cho trang quản lý

    if (deptFilter) {
        deptFilter.innerHTML = '<option value="Tất cả">Tất cả Phòng Ban</option>';
        depts.forEach(dept => {
            deptFilter.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;
        });
    }

    if (deptSelectModal) {
        deptSelectModal.innerHTML = '';
        depts.forEach(dept => {
            deptSelectModal.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;
        });
    }

    if (deptFilterManage) {
         deptFilterManage.innerHTML = '<option value="Tất cả">Tất cả Phòng Ban</option>';
         depts.forEach(dept => {
            deptFilterManage.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;
        });
    }
}

function renderEmployeeListTable(employees) {
    const tableBody = document.getElementById('employee-list-table-body');
    const selectedShift = document.getElementById('filter-shift').value; 

    if (!tableBody) return;

    if (employees.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Không tìm thấy nhân viên nào phù hợp.</td></tr>`;
        return;
    }

    tableBody.innerHTML = employees.map(emp => {
        const attendance = currentAttendance.find(att => 
            att.id === emp.id && att.date === today && att.shift === selectedShift
        );
        // Hiển thị trạng thái nghỉ, ngược lại hiển thị "<u>Chọn trạng thái</u>"
        const statusText = attendance && (attendance.status === 'Phép' || attendance.status === 'Không phép') 
                           ? attendance.status 
                           : "<u>Chọn trạng thái</u>"; 
        
        const isSelectedPhép = (attendance && attendance.status === 'Phép') ? 'checked' : '';
        const isSelectedKhôngPhép = (attendance && attendance.status === 'Không phép') ? 'checked' : '';


        // NỘI DUNG POPOVER: Chỉ Radio button và nút reset (Đã làm gọn theo yêu cầu)
        const popoverContent = `
            <div class="d-flex flex-column">
                <label class="mb-1">
                    <input type="radio" name="popover-att-${emp.id}" value="Phép" ${isSelectedPhép} 
                           onclick="updateAttendanceStatus(${emp.id}, 'Phép')"> Có phép
                </label>
                <label class="mb-1">
                    <input type="radio" name="popover-att-${emp.id}" value="Không phép" ${isSelectedKhôngPhép}
                           onclick="updateAttendanceStatus(${emp.id}, 'Không phép')"> Không phép
                </label>
                <hr class="my-1">
                <button class="btn btn-sm btn-link text-secondary" 
                        onclick="updateAttendanceStatus(${emp.id}, 'Đi làm')">
                    (Đánh dấu Đi làm)
                </button>
            </div>
        `;

        return `
            <tr data-employee-id="${emp.id}">
                <td>${emp.dept}</td> 
                <td>${emp.name}</td> 
                <td>${emp.position}</td>
                <td>${emp.phone || 'N/A'}</td> 
                <td class="text-center">
                    <div class="attendance-cell" 
                         data-toggle="popover" 
                         data-placement="left" 
                         data-html="true" 
                         data-content='${popoverContent.replace(/'/g, '&#39;')}' style="display:inline-block;">
                        ${statusText}
                    </div>
                </td>
                
                <td class="text-center">
                    <button class="btn btn-sm btn-warning mx-1" onclick="editEmployee(${emp.id})" title="Chỉnh sửa">
                        ✏️ 
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})" title="Xóa">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    initializePopovers();
}

function filterEmployees() {
    const deptFilterValue = document.getElementById('filter-dept').value;
    const searchName = document.getElementById('search-name').value.toLowerCase();
    
    let filteredList = getData(EMPLOYEE_DATA_KEY);

    if (deptFilterValue !== 'Tất cả') {
        filteredList = filteredList.filter(emp => emp.dept === deptFilterValue);
    }
    
    if (searchName) {
        filteredList = filteredList.filter(emp => emp.name.toLowerCase().includes(searchName));
    }

    renderEmployeeListTable(filteredList);
}

function updateAttendanceStatus(id, status) {
    const selectedShift = document.getElementById('filter-shift').value;
    
    // 1. Xóa trạng thái cũ (đảm bảo tính duy nhất cho NGÀY và CA này)
    currentAttendance = currentAttendance.filter(att => 
        !(att.id === id && att.date === today && att.shift === selectedShift)
    );
    
    // 2. Thêm trạng thái mới (chỉ lưu người vắng mặt)
    if (status !== 'Đi làm') {
        currentAttendance.push({ 
            id: id, 
            date: today, 
            shift: selectedShift, 
            status: status, 
            isPresent: false 
        });
    }

    saveData(ATTENDANCE_DATA_KEY, currentAttendance);

    // Xóa Popover khỏi DOM để tránh lỗi hiển thị liên tục
    $('.popover').remove(); 
    
    // Tải lại bảng để cập nhật trạng thái
    filterEmployees();
}

function showAddEmployeeFormFromList(isEdit = false, emp = null) {
    populateFilters(); 
    
    let defaultPhone = (emp && emp.phone && emp.phone !== "N/A") ? emp.phone : '';
    
    if (isEdit && emp) {
        $('#addEmployeeModalLabel').text('Chỉnh Sửa Nhân Viên');
        document.getElementById('edit-employee-id').value = emp.id;
        document.getElementById('emp-name-list').value = emp.name;
        document.getElementById('emp-dept-list').value = emp.dept;
        document.getElementById('emp-position-list').value = emp.position;
        document.getElementById('emp-phone-list').value = defaultPhone;
        // NẠP DỮ LIỆU CÁC TRƯỜNG MỚI
        document.getElementById('emp-dob-list').value = emp.dob || ''; 
        document.getElementById('emp-cccd-list').value = emp.cccd || '';
        document.getElementById('emp-start-date-list').value = emp.startDate || '';
        
    } else {
        $('#addEmployeeModalLabel').text('Thêm Nhân Viên Mới');
        document.getElementById('edit-employee-id').value = '';
        document.getElementById('emp-name-list').value = '';
        document.getElementById('emp-position-list').value = '';
        document.getElementById('emp-phone-list').value = '';
        // RESET CÁC TRƯỜNG MỚI KHI THÊM MỚI
        document.getElementById('emp-dob-list').value = '';
        document.getElementById('emp-cccd-list').value = '';
        document.getElementById('emp-start-date-list').value = '';
    }
    $('#addEmployeeModal').modal('show');
}

function editEmployee(id) {
    employeeList = getData(EMPLOYEE_DATA_KEY);
    const emp = employeeList.find(e => e.id === id);
    if (emp) {
        showAddEmployeeFormFromList(true, emp);
    }
}

function saveEmployeeFromList() {
    const id = document.getElementById('edit-employee-id').value;
    const name = document.getElementById('emp-name-list').value.trim();
    const deptName = document.getElementById('emp-dept-list').value;
    const position = document.getElementById('emp-position-list').value.trim();
    const phone = document.getElementById('emp-phone-list').value.trim();
    // LẤY DỮ LIỆU CÁC TRƯỜNG MỚI
    const dob = document.getElementById('emp-dob-list').value;
    const cccd = document.getElementById('emp-cccd-list').value.trim();
    const startDate = document.getElementById('emp-start-date-list').value;

    if (!name || !deptName || !position) {
        alert("Vui lòng nhập đầy đủ Tên, Phòng ban, và Chức vụ.");
        return;
    }
    
    if (!/^\d{10,11}$/.test(phone)) {
        alert("SĐT Liên hệ phải là 10 hoặc 11 chữ số.");
        return;
    }

    employeeList = getData(EMPLOYEE_DATA_KEY);

    if (id) {
        const index = employeeList.findIndex(e => e.id == id);
        if (index !== -1) {
            employeeList[index].name = name;
            employeeList[index].dept = deptName;
            employeeList[index].position = position;
            employeeList[index].phone = phone; 
            // CẬP NHẬT CÁC TRƯỜNG MỚI VÀO MASTER DATA
            employeeList[index].dob = dob || 'N/A';
            employeeList[index].cccd = cccd || 'N/A';
            employeeList[index].startDate = startDate || today;
        }
    } else {
        const newEmp = { 
            id: Date.now(), 
            name, 
            position, 
            dept: deptName, 
            phone: phone,
            dob: dob || 'N/A', 
            cccd: cccd || 'N/A',
            startDate: startDate || today,
        };
        employeeList.push(newEmp);
    }

    saveData(EMPLOYEE_DATA_KEY, employeeList);
    $('#addEmployeeModal').modal('hide');
    // Kiểm tra trang hiện tại để render lại đúng hàm
    if (document.getElementById('managed-employee-table-body')) {
        filterManagedEmployees(); 
    } else {
        filterEmployees();
    }
}

function deleteEmployee(id) {
    if (confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) {
        employeeList = getData(EMPLOYEE_DATA_KEY);
        employeeList = employeeList.filter(emp => emp.id !== id);
        saveData(EMPLOYEE_DATA_KEY, employeeList);
        
        // Kiểm tra trang hiện tại để render lại đúng hàm
        if (document.getElementById('managed-employee-table-body')) {
            filterManagedEmployees(); 
        } else {
            filterEmployees();
        }
    }
}

function saveAttendanceAndRedirect() {
    saveData(ATTENDANCE_DATA_KEY, currentAttendance);
    
    alert("✅ Dữ liệu điểm danh đã được lưu toàn bộ! Chuyển sang trang Thống kê.");
    
    window.location.href = 'report.html';
}

if (document.getElementById('employee-list-table-body')) {
    document.addEventListener('DOMContentLoaded', () => {
        employeeList = getData(EMPLOYEE_DATA_KEY); 
        currentAttendance = getData(ATTENDANCE_DATA_KEY);
        populateFilters();
        document.getElementById('filter-shift').value = 'Sáng';
        filterEmployees();
    });
}


// --- Logic Trang manage_employees.html (Quản lý Nhân Viên) ---

let currentEmployeeDetailId = null; 

// Hàm lọc và hiển thị danh sách nhân viên trên trang Quản lý
function renderManagedEmployeeTable(employees) {
    const tableBody = document.getElementById('managed-employee-table-body');
    const selectedDate = document.getElementById('date-select-manage').value || today;
    
    if (!tableBody) return;

    if (employees.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center">Không tìm thấy nhân viên nào.</td></tr>`;
        return;
    }

    tableBody.innerHTML = employees.map(emp => {
        // Lấy trạng thái nghỉ tổng hợp cho ngày đã chọn
        const dailyStatus = getDailyShiftStatus(emp.id, selectedDate);
        
        return `
            <tr>
                <td>${emp.dept}</td>
                <td>${emp.name}</td>
                <td>${emp.position}</td> 
                <td>${emp.dob || 'N/A'}</td>
                <td>${emp.cccd || 'N/A'}</td>
                <td>${emp.startDate || 'N/A'}</td>
                <td>${emp.phone || 'N/A'}</td>
                <td class="text-center text-danger">${dailyStatus}</td> <td class="text-center">
                    <button class="btn btn-sm btn-warning mx-1" onclick="editEmployee(${emp.id})" title="Chỉnh sửa">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})" title="Xóa">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}


function filterManagedEmployees() {
    const allEmployees = getData(EMPLOYEE_DATA_KEY);
    const deptFilterValue = document.getElementById('filter-dept-manage').value;
    const searchName = document.getElementById('search-name-manage').value.toLowerCase();
    
    let filteredList = allEmployees;

    if (deptFilterValue !== 'Tất cả') {
        filteredList = filteredList.filter(emp => emp.dept === deptFilterValue);
    }
    
    if (searchName) {
        filteredList = filteredList.filter(emp => emp.name.toLowerCase().includes(searchName));
    }

    renderManagedEmployeeTable(filteredList);
}

// HÀM TÍNH TOÁN TRẠNG THÁI NGHỈ TRONG NGÀY
function getDailyShiftStatus(empId, targetDate) {
    const allEmployees = getData(EMPLOYEE_DATA_KEY);
    const emp = allEmployees.find(e => e.id === empId);
    if (!emp) return 'Lỗi dữ liệu'; 

    const startDate = emp.startDate;
    const currentDate = new Date().toISOString().split('T')[0]; // Lấy ngày hiện tại

    // RULE 1: Ngày tra cứu trước ngày bắt đầu làm
    if (targetDate < startDate) {
        return 'Chưa rõ';
    }

    // RULE 2: Ngày tra cứu là ngày trong tương lai
    if (targetDate > currentDate) {
        return 'Chưa rõ';
    }
    
    // Logic cũ: Tính toán trạng thái nghỉ
    const allAttendance = getData(ATTENDANCE_DATA_KEY);
    
    const dailyAbsentRecords = allAttendance.filter(att => 
        att.id === empId && 
        att.date === targetDate && 
        (att.status === 'Phép' || att.status === 'Không phép')
    );
    
    if (dailyAbsentRecords.length === 0) {
        return 'Đi làm';
    }

    const morningStatus = dailyAbsentRecords.find(r => r.shift === 'Sáng');
    const afternoonStatus = dailyAbsentRecords.find(r => r.shift === 'Chiều');
    
    const statusM = morningStatus ? `Sáng (${morningStatus.status})` : '';
    const statusA = afternoonStatus ? `Chiều (${afternoonStatus.status})` : '';

    if (morningStatus && afternoonStatus) {
        let combinedStatus;
        
        if (morningStatus.status === 'Không phép' || afternoonStatus.status === 'Không phép') {
            combinedStatus = 'Không phép';
        } else {
            combinedStatus = 'Có phép';
        }

        return `Cả ngày (${combinedStatus})`; 
    } else if (statusM || statusA) {
        return statusM || statusA;
    }
    
    return 'Đi làm';
}


// Hàm tính toán thống kê điểm danh trong tháng của nhân viên (không dùng nữa)
function calculateMonthlyAttendance(employeeId) {
    const allAttendance = getData(ATTENDANCE_DATA_KEY);
    const targetMonth = today.substring(0, 7); 
    
    const relevantAttendance = allAttendance.filter(att => 
        att.id === employeeId && att.date.startsWith(targetMonth)
    );
    
    const uniqueAbsentDays = new Set(relevantAttendance.map(att => att.date));
    
    let daysAbsentApproved = 0;
    let daysAbsentUnapproved = 0;

    uniqueAbsentDays.forEach(day => {
        const dayRecords = relevantAttendance.filter(att => att.date === day);
        
        if (dayRecords.some(r => r.status === 'Không phép')) {
            daysAbsentUnapproved++;
        } else if (dayRecords.some(r => r.status === 'Phép')) {
            daysAbsentApproved++;
        }
    });

    const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const totalDaysAbsent = daysAbsentApproved + daysAbsentUnapproved;
    const daysPresent = Math.max(0, totalDaysInMonth - totalDaysAbsent);

    return {
        daysPresent,
        daysAbsentApproved,
        daysAbsentUnapproved,
        month: targetMonth,
        totalDaysInMonth
    };
}


// Hàm hiển thị modal xem chi tiết (chức năng bị loại bỏ khỏi bảng chính, chỉ còn lại logic tham chiếu)
function viewEmployeeDetail(id) {
    alert(`Chức năng xem chi tiết đã được gỡ khỏi bảng chính. Dữ liệu nhân viên: ${id}`);
}

// Khởi tạo trang Quản lý Nhân viên
if (document.getElementById('managed-employee-table-body')) {
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('date-select-manage').valueAsDate = new Date();
        populateFilters();
        filterManagedEmployees();
    });
}


// --- Logic Trang report.html (Thống kê) ---

if (document.getElementById('report-date-filter')) {
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('report-date-filter').valueAsDate = new Date();
        loadReportDataFinal();
    });
}
// --- CẬP NHẬT TRONG FILE script.js ---

// ... (Các hàm cũ giữ nguyên) ...

// --- LOGIC MỚI CHO TRANG manage_departments.html ---

// Hàm chính để tải và hiển thị bảng phòng ban
function renderDepartmentTable(departments) {
    const tableBody = document.getElementById('department-list-table-body');
    const allEmployees = getData(EMPLOYEE_DATA_KEY);

    if (!tableBody) return;

    if (departments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Không tìm thấy phòng ban nào.</td></tr>`;
        return;
    }

    tableBody.innerHTML = departments.map(dept => {
        // Tính số lượng nhân viên trong phòng ban này
        const employeeCount = allEmployees.filter(emp => emp.dept === dept.name).length;
        
        // Định dạng ngày tạo (giả sử dept.id là timestamp)
        const dateCreated = dept.id ? new Date(dept.id).toLocaleDateString('vi-VN') : 'N/A';
        
        return `
            <tr>
                <td>${dept.name}</td>
                <td class="text-center">${employeeCount}</td>
                <td>${dateCreated}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning mx-1" onclick="editDepartment(${dept.id}, '${dept.name.replace(/'/g, "\\'")}')" title="Chỉnh sửa">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${dept.id})" title="Xóa">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Hàm lọc phòng ban
function filterDepartments() {
    const allDepartments = getData(DEPARTMENT_DATA_KEY);
    const searchName = document.getElementById('search-dept-name').value.toLowerCase();
    
    let filteredList = allDepartments;

    if (searchName) {
        filteredList = filteredList.filter(dept => dept.name.toLowerCase().includes(searchName));
    }

    renderDepartmentTable(filteredList);
}

// Mở modal chỉnh sửa
function editDepartment(id, name) {
    document.getElementById('edit-dept-id').value = id;
    document.getElementById('edit-dept-name').value = name;
    $('#editDeptModal').modal('show');
}

// Lưu thay đổi tên phòng ban
function saveDepartmentChanges() {
    const id = parseInt(document.getElementById('edit-dept-id').value);
    const newName = document.getElementById('edit-dept-name').value.trim();

    if (!newName) {
        alert("Tên phòng ban không được để trống.");
        return;
    }
    
    let departments = getData(DEPARTMENT_DATA_KEY);
    let employees = getData(EMPLOYEE_DATA_KEY);

    const deptIndex = departments.findIndex(d => d.id === id);

    if (deptIndex !== -1) {
        const oldName = departments[deptIndex].name;
        
        // 1. Cập nhật tên trong danh sách phòng ban
        departments[deptIndex].name = newName;
        saveData(DEPARTMENT_DATA_KEY, departments);
        
        // 2. Cập nhật tên phòng ban trong danh sách nhân viên master data
        employees.forEach(emp => {
            if (emp.dept === oldName) {
                emp.dept = newName;
            }
        });
        saveData(EMPLOYEE_DATA_KEY, employees);

        alert(`✅ Đã đổi tên phòng ban từ "${oldName}" thành "${newName}".`);
        $('#editDeptModal').modal('hide');
        filterDepartments(); // Tải lại bảng
    }
}

// Xóa phòng ban
function deleteDepartment(id) {
    let departments = getData(DEPARTMENT_DATA_KEY);
    let employees = getData(EMPLOYEE_DATA_KEY);
    
    const deptToDelete = departments.find(d => d.id === id);
    if (!deptToDelete) return;

    // Kiểm tra nhân viên còn trực thuộc không
    const employeeCount = employees.filter(emp => emp.dept === deptToDelete.name).length;
    
    if (employeeCount > 0) {
        alert(`❌ Không thể xóa phòng ban này vì vẫn còn ${employeeCount} nhân viên trực thuộc.`);
        return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa phòng ban "${deptToDelete.name}"?`)) {
        departments = departments.filter(d => d.id !== id);
        saveData(DEPARTMENT_DATA_KEY, departments);
        alert("✅ Đã xóa phòng ban thành công.");
        filterDepartments();
    }
}

// Khởi tạo trang Quản lý Phòng Ban
if (document.getElementById('department-list-table-body')) {
    document.addEventListener('DOMContentLoaded', () => {
        filterDepartments();
    });
}
// ... (Các hàm khác giữ nguyên) ...
function loadReportDataFinal() {
    const reportDate = document.getElementById('report-date-filter').value || today;
    const reportShift = document.getElementById('report-shift-filter').value;
    const attendanceData = getData(ATTENDANCE_DATA_KEY);
    const masterEmployees = getData(EMPLOYEE_DATA_KEY);
    const totalEmployeesMaster = masterEmployees.length;

    if (!reportDate) return;

    let absentDataForReport = attendanceData.filter(att => 
        att.date === reportDate && (att.status === 'Phép' || att.status === 'Không phép')
    );
    
    if (reportShift !== 'Tất cả') {
        absentDataForReport = absentDataForReport.filter(att => att.shift === reportShift);
    }
    
    // --- 1. TÍNH TOÁN CÁC CHỈ SỐ TỔNG HỢP (cho 3 ô vuông) ---
    
    const totalAbsentApproved = absentDataForReport.filter(e => e.status === 'Phép').length;
    const totalAbsentUnapproved = absentDataForReport.filter(e => e.status === 'Không phép').length;
    
    if(document.getElementById('total-employees-metric')) {
        document.getElementById('total-employees-metric').textContent = totalEmployeesMaster;
        document.getElementById('total-absent-approved-metric').textContent = totalAbsentApproved;
        document.getElementById('total-absent-unapproved-metric').textContent = totalAbsentUnapproved;
    }

    // --- 2. TÍNH TOÁN THEO PHÒNG BAN (cho bảng dưới) ---
    
    const departments = getData(DEPARTMENT_DATA_KEY);
    const deptSummary = {};

    masterEmployees.forEach(emp => {
        const deptName = emp.dept;
        if (!deptSummary[deptName]) {
            deptSummary[deptName] = { approved: 0, unapproved: 0, totalEmployees: 0 };
        }
        deptSummary[deptName].totalEmployees += 1;
    });

    absentDataForReport.forEach(att => {
        const emp = masterEmployees.find(e => e.id === att.id);
        if (emp) {
            const deptName = emp.dept;
            if (deptSummary[deptName]) {
                if (att.status === 'Phép') {
                    deptSummary[deptName].approved += 1;
                } else if (att.status === 'Không phép') {
                    deptSummary[deptName].unapproved += 1;
                }
            }
        }
    });

    const tableBody = document.getElementById('report-dept-summary-body');
    let tableHtml = '';
    
    if (departments.length === 0) {
        tableHtml = `<tr><td colspan="4" class="text-center">Chưa có dữ liệu phòng ban.</td></tr>`;
    } else {
        departments.forEach(dept => {
            const summary = deptSummary[dept.name] || { approved: 0, unapproved: 0, totalEmployees: 0 };
            tableHtml += `
                <tr>
                    <td>${dept.name}</td>
                    <td class="text-center">${summary.totalEmployees}</td>
                    <td class="text-center">${summary.approved}</td>
                    <td class="text-center">${summary.unapproved}</td>
                </tr>
            `;
        });
    }
    
    tableBody.innerHTML = tableHtml;
}