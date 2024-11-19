#include <Windows.h>
#include <chrono>
#include <thread>
#include <iostream>

int main()
{
    int sleepLength = 500;
    bool foundWindows = true;
    HWND priceListHWND = FindWindowA(NULL, "Price List");
    HWND pricePopupHWND = FindWindowA(NULL, "Price Popup");
    while (!(IsWindow(priceListHWND) && IsWindow(pricePopupHWND))) {
        std::cout << sleepLength;
        std::this_thread::sleep_for(std::chrono::milliseconds(sleepLength));
        sleepLength += 1;

        if (sleepLength == 510) {
            foundWindows = false;
            break;
        }

        priceListHWND = FindWindowA(NULL, "Price List");
        pricePopupHWND = FindWindowA(NULL, "Price Popup");
    }

    if (foundWindows) {
        SetWindowPos(priceListHWND, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
        SetWindowPos(pricePopupHWND, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
    }

    return 0;
}