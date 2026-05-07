import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RouterOutlet } from '@angular/router';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterOutlet]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply theme class on init', () => {
    spyOn(document.body.classList, 'toggle');
    fixture.detectChanges();

    expect(document.body.classList.toggle).toHaveBeenCalled();
  });

  it('should clear timer on destroy', () => {
    spyOn(window, 'clearInterval');
    fixture.detectChanges();
    component.ngOnDestroy();

    expect(window.clearInterval).toHaveBeenCalled();
  });

  it('should apply day theme during day hours', () => {
    spyOn(document.body.classList, 'toggle');
    const now = new Date();
    spyOn(window, 'Date').and.returnValue({ getHours: () => 12 } as any);
    
    component['applyThemeClass']();
    
    expect(document.body.classList.toggle).toHaveBeenCalledWith('theme-day', true);
  });

  it('should apply night theme during night hours', () => {
    spyOn(document.body.classList, 'toggle');
    spyOn(window, 'Date').and.returnValue({ getHours: () => 20 } as any);
    
    component['applyThemeClass']();
    
    expect(document.body.classList.toggle).toHaveBeenCalledWith('theme-night', false);
  });
});
