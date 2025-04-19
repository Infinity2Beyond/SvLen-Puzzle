document.addEventListener('DOMContentLoaded', () => {
    const n = 4; 
    const imageURL = './image/DHTT.jpg';
    let gridSizePx = 400;

    // Adjust grid size for mobile
    if (window.innerWidth <= 768) {
        gridSizePx = Math.min(300, window.innerWidth * 0.7);
    }

    // Lấy tham chiếu đến các màn hình
    const nameInputScreen = document.getElementById('name-input-screen');
    const gameScreen = document.getElementById('game-screen');

    // Lấy tham chiếu đến các phần tử trong form nhập tên
    const nameForm = document.getElementById('name-form');
    const playerNameInput = document.getElementById('player-name');

    // Lấy tham chiếu đến các phần tử hiển thị tên
    const welcomeMessage = document.getElementById('welcome-message');
    const completionMessage = document.getElementById('completion-message');

    const puzzleGrid = document.getElementById('puzzle-grid');
    const piecesContainerLeft = document.getElementById('pieces-container-left');
    const piecesContainerRight = document.getElementById('pieces-container-right');
    const root = document.documentElement;



    // --- Thiết lập biến CSS ---
    root.style.setProperty('--n', n);
    root.style.setProperty('--grid-size', `${gridSizePx}px`);
    const pieceSizePx = gridSizePx / n;
    root.style.setProperty('--piece-size', `${pieceSizePx}px`);
    root.style.setProperty('--bg-image', `url('${imageURL}')`);

    let pieces = []; // Mảng chứa tất cả các phần tử mảnh ghép
    let draggedPiece = null;
    let isCompleted = false; // Cờ kiểm tra hoàn thành
    let playerName = ''; // Biến lưu tên người chơi

    // --- Hàm xáo trộn mảng (Fisher-Yates Shuffle) ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Tạo Lưới Ô Trống và Mảnh Ghép ---
    function createPuzzle() {
        puzzleGrid.innerHTML = '';
        piecesContainerLeft.innerHTML = '';
        piecesContainerRight.innerHTML = '';
        pieces = []; // Reset mảng mảnh ghép
        isCompleted = false; // Reset trạng thái hoàn thành
        puzzleGrid.classList.remove('puzzle-completed'); // Xóa class hoàn thành nếu có

        // Lấy kích thước của một vùng chứa bên (giả sử chúng giống nhau)
        let sideContainerWidth = Math.min(300, window.innerWidth * 0.9); // Giới hạn chiều rộng tối đa
        let sideContainerHeight = gridSizePx * 0.4; // Giảm chiều cao cho mobile
        const padding = 5; // Giảm padding cho mobile

        if (piecesContainerLeft.offsetParent !== null) {
            sideContainerWidth = piecesContainerLeft.offsetWidth - (padding * 2); // Trừ padding trái/phải
            sideContainerHeight = piecesContainerLeft.offsetHeight - (padding * 2); // Trừ padding trên/dưới
        }

        // --- Tạo ô trống và mảnh ghép (Vòng lặp không đổi) ---
        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                const pieceIndex = row * n + col;

                // 1. Tạo ô trống (Dropzone) - Giữ nguyên
                const dropzone = document.createElement('div');
                dropzone.classList.add('puzzle-dropzone');
                dropzone.dataset.row = row;
                dropzone.dataset.col = col;
                addDropzoneListeners(dropzone);
                puzzleGrid.appendChild(dropzone);

                // 2. Tạo mảnh ghép (Draggable Piece) - Giữ nguyên cách tạo
                const piece = document.createElement('div');
                piece.classList.add('puzzle-piece');
                piece.draggable = true;
                piece.dataset.id = `piece-${pieceIndex}`;
                piece.dataset.correctRow = row;
                piece.dataset.correctCol = col;

                // Tính toán background-position - Sửa lại để không dùng gap
                const divisorX = gridSizePx - pieceSizePx;
                const divisorY = gridSizePx - pieceSizePx;
                // Xử lý trường hợp chia cho 0 khi n=1
                const finalBgPosX = divisorX === 0 ? 0 : (col * pieceSizePx / divisorX) * 100;
                const finalBgPosY = divisorY === 0 ? 0 : (row * pieceSizePx / divisorY) * 100;
                piece.style.backgroundPosition = `${finalBgPosX}% ${finalBgPosY}%`;

                addPieceListeners(piece);
                pieces.push(piece); // Thêm vào mảng tổng để xử lý sau
            }
        }

        // --- PHÂN PHỐI MẢNH GHÉP VÀO HAI BÊN ---
        shuffleArray(pieces);

        pieces.forEach((piece, index) => {
            // Tính toán vị trí ngẫu nhiên bên trong vùng chứa bên
            const maxLeft = Math.max(0, sideContainerWidth - pieceSizePx);
            const maxTop = Math.max(0, sideContainerHeight - pieceSizePx);

            const randomLeft = Math.random() * maxLeft;
            const randomTop = Math.random() * maxTop;
            const randomRotation = Math.random() * 40 - 20; // -20 đến +20 độ

            piece.style.position = 'absolute';
            piece.style.left = `${randomLeft}px`;
            piece.style.top = `${randomTop}px`;
            piece.style.transform = `rotate(${randomRotation}deg)`;
            const initialZIndex = Math.floor(Math.random() * n * n) + 1; // z-index ngẫu nhiên > 0
            piece.style.zIndex = initialZIndex;
            piece.dataset.initialZIndex = initialZIndex; // Lưu lại z-index ban đầu

            // Phân phối xen kẽ vào hai container
            if (index % 2 === 0) { // Chẵn -> Bên trái
                piecesContainerLeft.appendChild(piece);
            } else { // Lẻ -> Bên phải
                piecesContainerRight.appendChild(piece);
            }
        });
    }

    // --- Trình nghe sự kiện cho Mảnh Ghép (addPieceListeners) ---
    function addPieceListeners(piece) {
        piece.addEventListener('dragstart', (e) => {
            draggedPiece = piece;
            // Quan trọng: Đặt z-index cao nhất khi kéo
            draggedPiece.style.zIndex = 1000; // Cao hơn các mảnh khác
            setTimeout(() => piece.classList.add('dragging'), 0); // Thêm class trễ 1 frame
            e.dataTransfer.setData('text/plain', piece.dataset.id);
             // (Tùy chọn) Làm mờ các mảnh khác một chút
             pieces.forEach(p => { if(p !== draggedPiece && !p.classList.contains('placed')) p.style.opacity = '0.6'; });
        });

        piece.addEventListener('dragend', () => {
             // Khôi phục opacity
             pieces.forEach(p => { if(!p.classList.contains('placed')) p.style.opacity = ''; });

             if (draggedPiece && !draggedPiece.classList.contains('placed')) {
                 // Nếu kéo thả không thành công (không vào ô đúng),
                 // trả lại z-index ban đầu đã lưu
                 draggedPiece.style.zIndex = draggedPiece.dataset.initialZIndex || Math.floor(Math.random() * n*n) + 1;
             }
            draggedPiece?.classList.remove('dragging'); // Dùng optional chaining (?) đề phòng lỗi
            draggedPiece = null;
        });
    }

    // --- Trình nghe sự kiện cho Ô Trống (addDropzoneListeners) ---
    function addDropzoneListeners(dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault(); // Quan trọng để cho phép drop
             if (!dropzone.hasChildNodes() || dropzone.contains(draggedPiece)) { // Chỉ cho phép drop vào ô trống
                dropzone.classList.add('drag-over');
             }
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');

            // Chỉ xử lý drop nếu kéo từ ngoài vào ô trống
            if (draggedPiece && !dropzone.hasChildNodes()) {
                const targetRow = dropzone.dataset.row;
                const targetCol = dropzone.dataset.col;
                const correctRow = draggedPiece.dataset.correctRow;
                const correctCol = draggedPiece.dataset.correctCol;

                if (targetRow === correctRow && targetCol === correctCol) {
                    // --- XÓA STYLE INLINE KHI ĐẶT VÀO Ô ---
                    draggedPiece.style.position = ''; // Để CSS quản lý
                    draggedPiece.style.left = '';
                    draggedPiece.style.top = '';
                    draggedPiece.style.transform = ''; // Xóa xoay
                    draggedPiece.style.zIndex = ''; // Để CSS (.placed) quản lý
                    draggedPiece.removeAttribute('data-initial-z-index'); // Không cần nữa

                    dropzone.appendChild(draggedPiece); // Di chuyển mảnh vào ô
                    draggedPiece.classList.add('placed'); // Class này quan trọng để CSS áp dụng
                    draggedPiece.draggable = false; // Không cho kéo mảnh đã đặt đúng

                    checkCompletion(); // Kiểm tra xem đã hoàn thành chưa
                } else {
                    console.log(`Sai vị trí! Thả vào [${targetRow}, ${targetCol}], đúng là [${correctRow}, ${correctCol}]`);
                    // Mảnh sẽ tự quay về vị trí cũ trong container bên nhờ dragend
                }
            }
        });
    }

    // --- Xử lý sự kiện submit form nhập tên ---
    nameForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Ngăn chặn gửi form mặc định
        playerName = playerNameInput.value.trim(); // Lấy tên người chơi

        if (playerName === '') {
            alert('Vui lòng nhập tên của bạn!');
            return;
        }

        // Hiển thị lời chào mừng trên màn hình trò chơi
        welcomeMessage.textContent = `Chào mừng, ${playerName}!`;
        completionMessage.textContent = `Chúc mừng, ${playerName}! Bạn đã hoàn thành trò chơi!`;
        // Ẩn màn hình nhập tên và hiển thị màn hình trò chơi
        nameInputScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        // Hiển thị con trỏ chuột trên game screen
        gameScreen.style.cursor = 'auto';

        // Khởi tạo Puzzle
        initializePuzzle();
    });

    // --- Kiểm tra hoàn thành ---
    function checkCompletion() {
        // Nếu đã hoàn thành rồi thì không cần kiểm tra lại
        if (isCompleted) {
            return;
        }

        const placedPieces = puzzleGrid.querySelectorAll('.puzzle-piece.placed').length;

        if (placedPieces === n * n) {
            isCompleted = true; // Đặt cờ đã hoàn thành
            puzzleGrid.classList.add('puzzle-completed'); // Thêm class để CSS ẩn viền/dropzone

            // Hide both pieces containers
            piecesContainerLeft.style.display = 'none';
            piecesContainerRight.style.display = 'none';

            // Vô hiệu hóa kéo/thả các mảnh còn lại (nếu có lỗi logic nào đó)
            pieces.forEach(p => {
                 if (!p.classList.contains('placed')) {
                     p.draggable = false;
                     p.style.opacity = '0.5'; // Làm mờ mảnh thừa
                     p.style.cursor = 'default';
                 }
            });
            
            completionMessage.classList.remove('hidden'); // SHOW MESSAGE
        }
    }
    // --- Khởi tạo Puzzle ---
    // Đóng gói vào hàm để dễ gọi lại (ví dụ: nút chơi lại)
    function initializePuzzle() {
         createPuzzle();
    }

}); // Kết thúc DOMContentLoaded