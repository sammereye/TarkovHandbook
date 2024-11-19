#include <iostream>
#include <vector>
#include <stdexcept>
#include <fstream>
#include <memory>
#include <cstring>
#include <tesseract/baseapi.h>
#include <leptonica/allheaders.h>
#include <chrono>
#include <windows.h>
#include <thread>
#include <stdio.h>
#include <algorithm>
#include <regex>
#include <string>

using namespace std;

class Image
{
private:
    vector<uint8_t> Pixels;
    uint32_t width, height;
    uint16_t BitsPerPixel;

    void Flip(void* In, void* Out, int width, int height, unsigned int Bpp);

public:
    explicit Image(HDC DC, int X, int Y, int Width, int Height);

    inline uint16_t GetBitsPerPixel() { return this->BitsPerPixel; }
    inline uint16_t GetBytesPerPixel() { return this->BitsPerPixel / 8; }
    inline uint16_t GetBytesPerScanLine() { return (this->BitsPerPixel / 8) * this->width; }
    inline int GetWidth() const { return this->width; }
    inline int GetHeight() const { return this->height; }
    inline const uint8_t* GetPixels() { return this->Pixels.data(); }
};

void Image::Flip(void* In, void* Out, int width, int height, unsigned int Bpp)
{
    unsigned long Chunk = (Bpp > 24 ? width * 4 : width * 3 + width % 4);
    unsigned char* Destination = static_cast<unsigned char*>(Out);
    unsigned char* Source = static_cast<unsigned char*>(In) + Chunk * (height - 1);

    while (Source != In)
    {
        memcpy(Destination, Source, Chunk);
        Destination += Chunk;
        Source -= Chunk;
    }
}

static void GetDesktopResolution(int& horizontal, int& vertical)
{
    RECT desktop;
    // Get a handle to the desktop window
    const HWND hDesktop = GetDesktopWindow();
    // Get the size of screen to the variable desktop
    GetWindowRect(hDesktop, &desktop);
    // The top left corner will have coordinates (0,0)
    // and the bottom right corner will have coordinates
    // (horizontal, vertical)
    horizontal = desktop.right;
    vertical = desktop.bottom;
}

Image::Image(HDC DC, int X, int Y, int Width, int Height) : Pixels(), width(Width), height(Height), BitsPerPixel(32)
{
    BITMAP Bmp = { 0 };
    HBITMAP hBmp = reinterpret_cast<HBITMAP>(GetCurrentObject(DC, OBJ_BITMAP));

    if (GetObject(hBmp, sizeof(BITMAP), &Bmp) == 0)
        throw runtime_error("BITMAP DC NOT FOUND.");

    RECT area = { X, Y, X + Width, Y + Height };
    HWND Window = WindowFromDC(DC);
    GetClientRect(Window, &area);

    HDC MemDC = GetDC(nullptr);
    HDC SDC = CreateCompatibleDC(MemDC);
    HBITMAP hSBmp = CreateCompatibleBitmap(MemDC, width, height);
    DeleteObject(SelectObject(SDC, hSBmp));

    BitBlt(SDC, 0, 0, width, height, DC, X, Y, SRCCOPY);
    unsigned int data_size = ((width * BitsPerPixel + 31) / 32) * 4 * height;
    vector<uint8_t> Data(data_size);
    this->Pixels.resize(data_size);

    BITMAPINFO Info = { sizeof(BITMAPINFOHEADER), static_cast<long>(width), static_cast<long>(height), 1, BitsPerPixel, BI_RGB, data_size, 0, 0, 0, 0 };
    GetDIBits(SDC, hSBmp, 0, height, &Data[0], &Info, DIB_RGB_COLORS);
    this->Flip(&Data[0], &Pixels[0], width, height, BitsPerPixel);

    DeleteDC(SDC);
    DeleteObject(hSBmp);
    ReleaseDC(nullptr, MemDC);
}

static bool pixelIsBorderColor(short& red, short& green, short& blue) {
    if (red == 82 && green == 89 && blue == 90) {
        return true;
    }
    else if (red == 0 && green == 0 && blue == 0) {
        return true;
    }
    else if (red == 11 && green == 12 && blue == 12) {
        return true;
    }
    else if (red == 97 && green == 99 && blue == 96) {
        return true;
    }
    else if (red == 83 && green == 90 && blue == 91) {
        return true;
    }

    return false;
}

static bool pixelIsValid(short CURSOR_TOOLTIP_OFFSET_X, short CURSOR_TOOLTIP_OFFSET_Y, short& red, short& green, short& blue, short offsetX = 0, short offsetY = 0) {
    HDC dc = NULL;
    COLORREF color = 0;
    POINT p;
    LONG x = 0L;
    LONG y = 0L;

    if (GetCursorPos(&p)) {
        dc = GetDC(NULL);
        if (p.y + CURSOR_TOOLTIP_OFFSET_Y > 0) {
            x = p.x + CURSOR_TOOLTIP_OFFSET_X + offsetX;
            y = p.y + CURSOR_TOOLTIP_OFFSET_Y + offsetY;
            color = GetPixel(dc, x, y);
            red = GetRValue(color);
            green = GetGValue(color);
            blue = GetBValue(color);
        }
        ReleaseDC(NULL, dc);
    }

    return pixelIsBorderColor(red, green, blue);
}

static void getLastBorderPoint(short CURSOR_TOOLTIP_OFFSET_X, short CURSOR_TOOLTIP_OFFSET_Y, short& checks, short& red, short& green, short& blue, short& offsetX, short checkRange) {
    checks++;
    while (pixelIsValid(CURSOR_TOOLTIP_OFFSET_X, CURSOR_TOOLTIP_OFFSET_Y, red, blue, green, offsetX)) {
        offsetX += checkRange;
        checks++;
    }
    offsetX -= checkRange;
}

static char* scanForText(int x1, int y1, int width, int height) {
    char* outText{};
    HWND SomeWindowHandle = GetDesktopWindow();
    HDC DC = GetDC(SomeWindowHandle);

    Image Img = Image(DC, x1, y1, width, height); //screenshot of 0, 0, 200, 200..

    ReleaseDC(SomeWindowHandle, DC);

    unique_ptr<tesseract::TessBaseAPI> tesseract_ptr(new tesseract::TessBaseAPI());

    tesseract_ptr->Init(NULL, "eng");
    tesseract_ptr->SetImage(Img.GetPixels(), Img.GetWidth(), Img.GetHeight(), Img.GetBytesPerPixel(), Img.GetBytesPerScanLine()); //Fixed this line..

    outText = tesseract_ptr->GetUTF8Text();

    //cout << utf8_text_ptr.get() << "\n";
    return outText;
}

int main()
{
    /*
    using chrono::high_resolution_clock;
    using chrono::duration_cast;
    using chrono::duration;
    using chrono::milliseconds;

    auto t1 = high_resolution_clock::now();
    */
    // 2560x1440
    const short ONE_ROW_TOOLTIP_HEIGHT_1440 = -29;
    const short TWO_ROW_TOOLTIP_HEIGHT_1440 = -50;
    const short CURSOR_TOOLTIP_OFFSET_X_1440 = 13;
    const short CURSOR_TOOLTIP_OFFSET_Y_1440 = -13;

    // 1920x1080
    const short ONE_ROW_TOOLTIP_HEIGHT_1080 = -19;
    const short TWO_ROW_TOOLTIP_HEIGHT_1080 = -35;
    const short CURSOR_TOOLTIP_OFFSET_X_1080 = 11;
    const short CURSOR_TOOLTIP_OFFSET_Y_1080 = -11;

    short ONE_ROW_TOOLTIP_HEIGHT{};
    short TWO_ROW_TOOLTIP_HEIGHT{};
    short CURSOR_TOOLTIP_OFFSET_X{};
    short CURSOR_TOOLTIP_OFFSET_Y{};

    int horizontal = 0;
    int vertical = 0;
    GetDesktopResolution(horizontal, vertical);
    if (horizontal == 2560 && vertical == 1440) {
        ONE_ROW_TOOLTIP_HEIGHT = ONE_ROW_TOOLTIP_HEIGHT_1440;
        TWO_ROW_TOOLTIP_HEIGHT = TWO_ROW_TOOLTIP_HEIGHT_1440;
        CURSOR_TOOLTIP_OFFSET_X = CURSOR_TOOLTIP_OFFSET_X_1440;
        CURSOR_TOOLTIP_OFFSET_Y = CURSOR_TOOLTIP_OFFSET_Y_1440;
    }
    else if (horizontal == 1920 && vertical == 1080) {
        ONE_ROW_TOOLTIP_HEIGHT = ONE_ROW_TOOLTIP_HEIGHT_1080;
        TWO_ROW_TOOLTIP_HEIGHT = TWO_ROW_TOOLTIP_HEIGHT_1080;
        CURSOR_TOOLTIP_OFFSET_X = CURSOR_TOOLTIP_OFFSET_X_1080;
        CURSOR_TOOLTIP_OFFSET_Y = CURSOR_TOOLTIP_OFFSET_Y_1080;
    }
    else {
        cout << "RESOLUTION_ERROR";
        fflush(stdout);
        return 0;
    }

    string scanText{};
    short checkRange = 50;
    short offsetX = 0;
    short offsetY = 0;
    LONG width = 0;
    LONG height = 0;
    short red = 0;
    short green = 0;
    short blue = 0;
    short checks = 0;
    POINT mousePos{};
    POINT lastValidMousePos{};
    POINT initPoint{};
    POINT finalPoint{};
    bool outputMouseMove = true;
    short checkpoints[6] = { 50, 25, 12, 6, 3, 1 };
    while (true) {
        //this_thread::sleep_for(chrono::milliseconds(100));
        if (GetCursorPos(&mousePos)) {
            if (outputMouseMove && (lastValidMousePos.x != mousePos.x || lastValidMousePos.y != mousePos.y)) {
                cout << "MOUSEMOVE" << endl;
                lastValidMousePos = mousePos;
                fflush(stdout);
                outputMouseMove = false;
            }

            if (pixelIsValid(CURSOR_TOOLTIP_OFFSET_X, CURSOR_TOOLTIP_OFFSET_Y, red, green, blue) && !outputMouseMove) {
                using chrono::high_resolution_clock;
                using chrono::duration_cast;
                using chrono::duration;
                using chrono::milliseconds;

                //auto t1 = high_resolution_clock::now();
                initPoint.x = mousePos.x + CURSOR_TOOLTIP_OFFSET_X;
                initPoint.y = mousePos.y + CURSOR_TOOLTIP_OFFSET_Y;
                checks = 0;

                // 50
                checkRange = 50;
                offsetX = checkRange;
                for (short i = 0; i < 6; i++) {
                    checkRange = checkpoints[i];
                    offsetX += checkRange;
                    getLastBorderPoint(CURSOR_TOOLTIP_OFFSET_X, CURSOR_TOOLTIP_OFFSET_Y, checks, red, green, blue, offsetX, checkRange);
                }

                finalPoint.x = initPoint.x + offsetX;
                finalPoint.y = initPoint.y;

                offsetY = ONE_ROW_TOOLTIP_HEIGHT - 5;
                if (pixelIsValid(CURSOR_TOOLTIP_OFFSET_X, CURSOR_TOOLTIP_OFFSET_Y, red, green, blue, offsetX, offsetY)) {
                    initPoint.y += TWO_ROW_TOOLTIP_HEIGHT;
                }
                else {
                    initPoint.y += ONE_ROW_TOOLTIP_HEIGHT;
                }
                //cout << '(' << red << ',' << green << ',' << blue << ')' << endl;

                // Moving to remove border
                initPoint.x += 1;
                initPoint.y += 1;
                finalPoint.y += 1;

                if (horizontal == 2560) {
                    initPoint.x += 1;
                    initPoint.y += 1;
                }

                width = finalPoint.x - initPoint.x;
                height = finalPoint.y - initPoint.y;

                if (width > 10 && height > 10) {
                    //cout << initPoint.x << ',' << initPoint.y << '|' << finalPoint.x << ',' << finalPoint.y << endl;
                    scanText = scanForText(initPoint.x, initPoint.y, width, height);
                    scanText = regex_replace(scanText, regex("\r\n"), "");
                    scanText = regex_replace(scanText, regex("\n"), "");
                    scanText = regex_replace(scanText, regex("@"), "0");
                    if (scanText.length() > 0) {
                        cout << scanText << "||" << mousePos.x << "," << mousePos.y << endl;
                        lastValidMousePos = mousePos;
                        fflush(stdout);
                        outputMouseMove = true;
                    }
                    //auto t2 = high_resolution_clock::now();
                    //auto ms_int = duration_cast<milliseconds>(t2 - t1);
                    //cout << ms_int.count() << "ms\n";
                }
                //cout << "Width: " << width << "Height: " << height << " Initial point: " << initPoint.x << ", Final point: " << finalPoint.x << "in " << checks << " checks" << endl;
            }
        }
    }

    /*
    auto t2 = high_resolution_clock::now();

    auto ms_int = duration_cast<milliseconds>(t2 - t1);

    duration<double, milli> ms_double = t2 - t1;

    cout << ms_int.count() << "ms\n";
    cout << ms_double.count() << "ms\n";
    */

    return 0;
}