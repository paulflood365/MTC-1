import { Component, OnInit, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { QuestionService } from '../services/question/question.service';
import { AuditService } from '../services/audit/audit.service';
import { WarmupStarted} from '../services/audit/auditEntry';
import { SpeechService } from '../services/speech/speech.service';
import { WindowRefService } from '../services/window-ref/window-ref.service';

@Component({
  selector: 'app-instructions',
  templateUrl: './instructions.component.html',
  styleUrls: ['./instructions.component.css']
})
export class InstructionsComponent implements AfterViewInit, OnDestroy {

  public count: number;
  public loadingTime: number;
  public questionTime: number;
  public shouldShowMore: boolean;
  protected window: any;
  private speechListenerEvent: any;

  constructor(
    private router: Router,
    private questionService: QuestionService,
    private auditService: AuditService,
    private speechService: SpeechService,
    protected windowRefService: WindowRefService,
    private elRef: ElementRef) {
    this.count = this.questionService.getNumberOfQuestions();
    const config = this.questionService.getConfig();
    this.loadingTime = config.loadingTime;
    this.questionTime = config.questionTime;
    this.window = windowRefService.nativeWindow;
    this.shouldShowMore = config && config.practice && (config.fontSize || config.colourContrast);
  }

  onClick() {
    this.auditService.addEntry(new WarmupStarted());
    this.router.navigate(['check']);
  }

  // wait for the component to be rendered first, before parsing the text
  ngAfterViewInit() {
    // Fix for iOS when opened via the camera.  The site scrolls down past the header on the login-success page,
    // so we fix it here.  Scrolling back top the top makes sure the timer will be displayed on the page.
    this.window.scrollTo(0, 0)

    if (this.questionService.getConfig().questionReader) {
      this.speechService.speakElement(this.elRef.nativeElement).then(() => {
        this.speechService.focusEndOfSpeech(this.elRef.nativeElement.querySelector('#start-now-button'));
      });

      this.speechListenerEvent = this.elRef.nativeElement.addEventListener('focus',
        (event) => { this.speechService.focusEventListenerHook(event); },
        true
      );
    }
  }

  ngOnDestroy(): void {
    // stop the current speech process if the page is changed
    if (this.questionService.getConfig().questionReader) {
      this.speechService.cancel();

      this.elRef.nativeElement.removeEventListener('focus', this.speechListenerEvent, true);
    }
  }
}
