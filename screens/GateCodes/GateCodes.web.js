import React from 'react';

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gate Codes (Static Web View)</title>
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
            display: flex;
            justify-content: center;
        }

        .container {
            width: 100%;
            max-width: 600px;
            background-color: #fff;
            height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        .search-bar {
            height: 45px;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 0 15px;
            font-size: 16px;
            margin-bottom: 15px;
            background-color: #f1f1f1;
            color: #333;
            width: 100%;
            box-sizing: border-box;
        }
        
        .list-container {
            flex: 1;
            overflow-y: auto;
            padding-bottom: 80px;
        }

        .code-card {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: transform 0.2s ease;
        }

        .code-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        }

        .card-image-container {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            overflow: hidden;
            margin-right: 15px;
            flex-shrink: 0;
        }

        .card-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .card-content {
            flex-grow: 1;
        }

        .location {
            font-size: 16px;
            font-weight: bold;
            color: #6BB9F0;
            margin-bottom: 5px;
        }

        .code {
            font-size: 14px;
            color: #333;
            margin-bottom: 5px;
            font-style: italic;
        }
        
        .dsp-name {
            font-size: 12px;
            color: #999;
            font-style: italic;
        }

        .card-actions {
            margin-left: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
        }

        .delete-icon {
            color: #DC3545;
            cursor: pointer;
            padding: 5px;
            transition: transform 0.2s ease;
        }
        
        .delete-icon:hover {
            transform: scale(1.1);
        }
        
        .fab {
            position: fixed;
            width: 60px;
            height: 60px;
            align-items: center;
            justify-content: center;
            right: 30px;
            bottom: 30px;
            background-color: #6BB9F0;
            border-radius: 30px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            display: flex;
            cursor: pointer;
            color: white;
            font-size: 30px;
            transition: background-color 0.2s ease;
        }
        
        .fab:hover {
            background-color: #5ca3e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <input type="text" class="search-bar" placeholder="Search by address, notes, or DSP..."/>
        <div class="list-container">
            <div class="code-card">
                <div class="card-image-container">
                    <img src="https://via.placeholder.com/80x80/6BB9F0/ffffff?text=Gate" class="card-image" alt="Gate Image">
                </div>
                <div class="card-content">
                    <div class="location">123 Pine St, Dallas, TX</div>
                    <div class="code">Status: Encrypted</div> 
                    <div class="dsp-name">Added by: DSP Alpha</div>
                </div>
                <div class="card-actions">
                    <ion-icon name="trash-outline" class="delete-icon" size="large"></ion-icon>
                    <ion-icon name="chevron-forward" style="color:#666; font-size: 24px;"></ion-icon>
                </div>
            </div>
            <div class="code-card">
                <div class="card-image-container">
                    <img src="https://via.placeholder.com/80x80/FF9AA2/ffffff?text=Code" class="card-image" alt="Gate Image">
                </div>
                <div class="card-content">
                    <div class="location">456 Oak Ln, Atlanta, GA</div>
                    <div class="code">Status: Encrypted</div> 
                    <div class="dsp-name">Added by: DSP Beta</div>
                </div>
                <div class="card-actions">
                    <ion-icon name="trash-outline" class="delete-icon" size="large"></ion-icon>
                    <ion-icon name="chevron-forward" style="color:#666; font-size: 24px;"></ion-icon>
                </div>
            </div>
            <p style="text-align: center; color: #aaa; margin-top: 30px;">(More list items would scroll here)</p>
        </div>
    </div>
    <div class="fab">
        <ion-icon name="add"></ion-icon>
    </div>
</body>
</html>
`;

export default function GateCodesWeb() {
    return (
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} style={{ width: '100%', height: '100%' }} />
    );
}