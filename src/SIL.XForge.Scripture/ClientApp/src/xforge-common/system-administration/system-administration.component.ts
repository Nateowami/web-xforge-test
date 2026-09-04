import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { MobileNotSupportedComponent } from '../../app/shared/mobile-not-supported/mobile-not-supported.component';
import { SaProjectsComponent } from './sa-projects.component';
import { SaUsersComponent } from './sa-users.component';

@Component({
  selector: 'app-system-administration',
  templateUrl: './system-administration.component.html',
  styleUrls: ['./system-administration.component.scss'],
  imports: [AsyncPipe, MobileNotSupportedComponent, MatTabGroup, MatTab, SaUsersComponent, SaProjectsComponent]
})
export class SystemAdministrationComponent {
  constructor(readonly onlineStatusService: OnlineStatusService) {}
}
